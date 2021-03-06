import json
import time
import logging
from functools import wraps
import redis
from datetime import datetime
from django.utils import dateparse
from urllib.parse import urlparse
from django.conf import settings
from django.core.cache import cache
from django.http import JsonResponse
from django.shortcuts import redirect
from django.template.loader import render_to_string
from django.urls import reverse
from intuitlib.client import AuthClient
from intuitlib.enums import Scopes
from intuitlib.exceptions import AuthClientError
from quickbooks import QuickBooks
from quickbooks.exceptions import (
    AuthorizationException, UnsupportedException, GeneralException, ValidationException,
    SevereException,
)
from quickbooks.objects import Bill, TaxCode, TaxRate
from quickbooks.objects.item import Item


QBO_DEFAULT_ARGS = dict(
    minorversion=23,
)


# decorator to handle caching
def json_cache(f):
    @wraps(f)
    def wrapper(request, *args, **kwargs):
        log('cache_wrapper:: {}'.format(request.get_full_path()))
        redis_client = get_redis_client()
        cache_key_results = request.get_full_path()
        cache_key_lock = 'lock_{}'.format(request.get_full_path())
        cache_key_date = 'date_{}'.format(request.get_full_path())
        cached_results = redis_client.get(cache_key_results)
        cached_results = json.loads(cached_results) if cached_results else None
        cached_stamp = redis_client.get(cache_key_date)
        is_fresh = cached_results and cached_stamp and (datetime.utcnow() - datetime.fromtimestamp(int(cached_stamp))).seconds < settings.ESTIMATE_QUERY_SECONDS

        # return cached data
        if is_fresh:
            log('returning fresh cached data')
        else:
            # return stale data if another thread is already fetching fresh data
            lock_exists = not cache.add(cache_key_lock, True, settings.CACHE_LOCK_SECONDS)
            if lock_exists and cached_results:
                log('returning stale cached data because we are already fetching new data')
            # return new data
            else:
                log('fetching fresh data')

                # capture original response from the decorated function
                response = f(request, *args, **kwargs)

                # cache results and unset the "fetching" lock
                redis_client.set(cache_key_results, response.content)
                redis_client.set(cache_key_date, int(time.time()))
                cache.delete(cache_key_lock)

                # include cache headers since this is fresh data
                response['Cache-Control'] = 'max-age={}'.format(settings.ESTIMATE_QUERY_SECONDS)

                # return original response
                return response

        # returning cached response
        return JsonResponse(cached_results)
    return wrapper


# decorator to handle auth exceptions
def quickbooks_auth(f):
    @wraps(f)
    def wrapper(request, *args, **kwargs):

        if not request.user.is_authenticated:

            if is_json_request(request):
                return JsonResponse({'success': False, 'reason': 'authentication', 'details': 'not authenticated'})

            return redirect(reverse('login'))

        redis_client = get_redis_client()

        access_token = redis_client.get('access_token')
        refresh_token = redis_client.get('refresh_token')

        # not authenticated with qbo
        if not refresh_token or not access_token:

            log('no access token')

            # json requests should return contextual data vs getting redirected
            if is_json_request(request):
                return JsonResponse({'success': False, 'reason': 'authentication', 'details': 'no access token'})

            # redirect to QBO authorization URL
            auth_client = get_qbo_auth_client(get_callback_url(request))
            auth_url = auth_client.get_authorization_url([Scopes.ACCOUNTING])
            return redirect(auth_url)

        # conditionally refresh the qbo access token if it's close to expiring
        try:
            # add a temporary lock so no other process attempts a refresh at the same time
            lock_exists = not cache.add('refresh_access_token_lock', True, 10)
            if not lock_exists and qbo_access_token_needs_refreshing():
                refresh_qbo_access_token(get_callback_url(request))
        except Exception as e:
            # something went wrong refreshing the access token, but since it could be a transient error, let the request continue to work itself out
            logging.exception(e)

        # perform the actual view
        try:
            return f(request, *args, **kwargs)
        except (AuthClientError, AuthorizationException) as e:
            # session appears to have expired so wipe token
            log('quickbooks auth exception, clearing token and redirecting (%s)' % e)
            redis_client.delete('access_token')
            # json requests should return contextual data vs getting redirected
            if is_json_request(request):
                return JsonResponse({'success': False, 'reason': 'authentication', 'details': str(e)})
            return redirect(reverse('dashboard'))
        except (UnsupportedException, GeneralException, ValidationException, SevereException) as e:
            log('qb exception')
            log(e)
            raise e
        except Exception as e:
            log('other exception')
            logging.exception(e)
            raise e
    return wrapper


def is_json_request(request):
    return request.content_type == 'application/json' or 'application/json' in request.META['HTTP_ACCEPT']


def qbo_access_token_needs_refreshing():
    # tokens expire every hour so we should refresh when it's close

    seconds_expire = 50 * 60

    redis_client = get_redis_client()

    access_token_date = redis_client.get('access_token_date') or ''

    # parse the date
    access_token_date = dateparse.parse_datetime(access_token_date)

    needs_refresh = access_token_date and (datetime.utcnow() - access_token_date).seconds > seconds_expire

    if needs_refresh:
        log('Need to refresh QBO access token: {}'.format(redis_client.get('access_token')))

    return needs_refresh


def refresh_qbo_access_token(callback_url: str):
    log('refreshing QBO access token')

    redis_client = get_redis_client()

    # refresh the access token
    auth_client = get_qbo_auth_client(callback_url)
    auth_client.refresh(refresh_token=redis_client.get("refresh_token"))

    log('New access token: {}'.format(auth_client.access_token))

    # save the new values
    redis_client.set('access_token_date', datetime.utcnow().isoformat())
    redis_client.set('access_token', auth_client.access_token)
    redis_client.set('refresh_token', auth_client.refresh_token)


def get_callback_url(request):
    callback_url = request.build_absolute_uri(reverse('callback'))
    # enforce https in production since qbo oauth requires it
    if not settings.DEBUG:
        parsed = urlparse(callback_url)
        callback_url = 'https://{}{}'.format(parsed.hostname, parsed.path)
    return callback_url


def get_qbo_auth_client(callback_url):

    return AuthClient(
        client_id=settings.QBO_CLIENT_ID,
        client_secret=settings.QBO_CLIENT_SECRET,
        environment='sandbox' if settings.DEBUG else 'production',
        redirect_uri=callback_url,
    )


def get_qbo_client(callback_url):
    # https://developer.intuit.com/app/developer/qbo/docs/develop/authentication-and-authorization/oauth-2.0

    redis_client = get_redis_client()

    auth_client = get_qbo_auth_client(callback_url)

    return QuickBooks(
        auth_client=auth_client,
        refresh_token=redis_client.get('refresh_token'),
        company_id=redis_client.get('realm_id'),
        **QBO_DEFAULT_ARGS
    )


def get_redis_client():
    return redis.from_url(settings.REDIS_URL, decode_responses=True)  # decode to unicode strings


def log(m):
    logging.info(m)


def multiply_items(items, single_print=False):
    expanded = []
    # conditionally only print one of each item vs item's actual quantity when expanding
    for item in items:
        if 'ItemBasedExpenseLineDetail' in item:
            quantity = 1 if single_print else item['ItemBasedExpenseLineDetail']['Qty']
            expanded.extend(quantity * [item])
    return expanded


def get_html(request, bill_id):
    css = request.GET.get('css')
    client = get_qbo_client(get_callback_url(request))
    bill = Bill.get(int(bill_id), qb=client)
    bill = json.loads(bill.to_json())
    attach_prices(bill, client)
    single_print = request.GET.get('single_print', '')
    items = multiply_items(bill['Line'], single_print)
    context = {
        'rows': [items[i:i+settings.PRINT_LABEL_COLS] for i in range(0, len(items), settings.PRINT_LABEL_COLS)],
        'css': css,
    }
    return render_to_string('labels.html', context).encode()


def get_items_for_bill(bill, client):
    ids = [l['ItemBasedExpenseLineDetail']['ItemRef']['value'] for l in bill['Line'] if 'ItemBasedExpenseLineDetail' in l]
    items = Item.choose(ids, field="Id", qb=client)
    return [json.loads(i.to_json()) for i in items]


def attach_prices(bill, client):
    items = get_items_for_bill(bill, client)
    for line in bill['Line']:
        for item in items:
            if 'ItemBasedExpenseLineDetail' in line and line['ItemBasedExpenseLineDetail']['ItemRef']['value'] == item.get('Id'):
                line['UnitPrice'] = item.get('UnitPrice')
                break
    return bill


def estimate_has_tag_number(estimate):
    for custom_field in estimate.get('CustomField', []):
        if custom_field['Name'] == 'Tag #' and custom_field['StringValue']:
            return True
    return False


def get_inventory_items(request, pos, all_stock=False):
    client = get_qbo_client(get_callback_url(request))
    results = Item.query('SELECT * from Item WHERE Active = true STARTPOSITION %s MAXRESULTS %s' % (pos, settings.QBO_MAX_RESULTS), qb=client)

    # conditionally return all items regardless if they're in stock or not
    if all_stock:
        return results

    # limit items that are in stock
    return [r for r in results if r.QtyOnHand > 0]


def get_custom_field_index_from_preferences(field_name: str, preferences: dict) -> int:
    if 'SalesFormsPrefs' in preferences:
        if 'CustomField' in preferences['SalesFormsPrefs']:
            for custom_field in preferences['SalesFormsPrefs']['CustomField']:
                for field in custom_field['CustomField']:
                    if 'StringValue' in field and field['StringValue'] == field_name:
                        # return the digit from the "Name" which looks something like "SalesCustomName3"
                        return field['Name'][-1]
    return -1


def get_qbo_tax_code_rate(qbo_tax_class, qbo_client) -> dict:
    # gets and caches qbo tax code and tax rate for San Diego
    if qbo_tax_class is TaxCode:
        cache_key = 'tax_code'
    elif qbo_tax_class is TaxRate:
        cache_key = 'tax_rate'
    else:
        raise Exception('unknown qbo tax class {}'.format(qbo_tax_class))
    cached_value = cache.get(cache_key)
    if cached_value:
        logging.info('using cached value for {}'.format(qbo_tax_class))
        return cached_value
    else:
        logging.info('querying tax object for {}'.format(qbo_tax_class))
        # query tax code/rate
        values = qbo_tax_class.filter(Name='San Diego', qb=qbo_client)
        if not values:
            error = 'Unable to find San Diego tax results'
            logging.error(error)
            raise Exception(error)
        result = values[0].to_dict()
        cache.set(cache_key, result, None)
        return result
