import json
import time
import logging
from functools import wraps
import redis
from datetime import datetime
from urlparse import urlparse
from django.conf import settings
from django.core.cache import cache
from django.http import JsonResponse
from django.shortcuts import redirect
from django.template.loader import render_to_string
from django.urls import reverse
from quickbooks import QuickBooks, Oauth2SessionManager
from quickbooks.exceptions import (
    AuthorizationException, UnsupportedException, GeneralException, ValidationException,
    SevereException,
)
from quickbooks.objects import Bill
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
        cached_stamp = redis_client.get(cache_key_date) or 0
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

            if request.content_type == 'application/json':
                return JsonResponse({'success': False, 'reason': 'authentication'})

            return redirect(reverse('login'))

        redis_client = get_redis_client()

        # not authenticated with qbo
        if not redis_client.get('access_token'):

            log('no access token')

            # json requests should return contextual data vs getting redirected
            if request.content_type == 'application/json':
                return JsonResponse({'success': False, 'reason': 'authentication'})

            session_manager = get_qbo_session_manager(request)

            # store for future use
            callback_url = get_callback_url(request)
            authorize_url = session_manager.get_authorize_url(callback_url)

            return redirect(authorize_url)

        try:
            return f(request, *args, **kwargs)
        except AuthorizationException as e:
            # session appears to have expired so wipe token
            log('quickbooks exception, clearing token and redirecting (%s)' % e)
            redis_client.delete('access_token')
            # json requests should return contextual data vs getting redirected
            if request.content_type == 'application/json':
                return JsonResponse({'success': False, 'reason': 'authentication'})
            return redirect(reverse('dashboard'))
        except (UnsupportedException, GeneralException, ValidationException, SevereException) as e:
            log('qb exception')
            log(e)
            raise e
        except Exception as e:
            log('other exception')
            log(e)
            raise e
    return wrapper


def get_callback_url(request):
    callback_url = request.build_absolute_uri(reverse('callback'))
    # enforce https in production since qbo oauth requires it
    if not settings.DEBUG:
        parsed = urlparse(callback_url)
        callback_url = 'https://{}{}'.format(parsed.hostname, parsed.path)
    return callback_url


def get_qbo_session_manager(request):
    callback_url = get_callback_url(request)
    return Oauth2SessionManager(
        client_id=settings.QBO_CLIENT_ID,
        client_secret=settings.QBO_CLIENT_SECRET,
        base_url=callback_url,  # the base_url has to be the same as the one used in authorization
    )


def get_qbo_client():
    redis_client = get_redis_client()

    session_manager = Oauth2SessionManager(
        client_id=settings.QBO_CLIENT_ID,
        client_secret=settings.QBO_CLIENT_SECRET,
        access_token=redis_client.get('access_token'),
    )

    return QuickBooks(
        sandbox=settings.DEBUG,
        session_manager=session_manager,
        company_id=redis_client.get('realm_id'),
        **QBO_DEFAULT_ARGS
    )


def get_redis_client():
    return redis.from_url(settings.REDIS_URL)


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
    client = get_qbo_client()
    bill = Bill.get(int(bill_id), qb=client)
    bill = json.loads(bill.to_json())
    attach_prices(bill, client)
    single_print = request.GET.get('single_print', '')
    items = multiply_items(bill['Line'], single_print)
    context = {
        'rows': [items[i:i+settings.PRINT_LABEL_COLS] for i in range(0, len(items), settings.PRINT_LABEL_COLS)],
        'css': css,
    }
    return render_to_string('labels.html', context)


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


def get_inventory_items(pos, all_stock=False):
    client = get_qbo_client()
    results = Item.query('SELECT * from Item WHERE Active = true STARTPOSITION %s MAXRESULTS %s' % (pos, settings.QBO_MAX_RESULTS), qb=client)

    # conditionally return all items regardless if they're in stock or not
    if all_stock:
        return results

    # limit items that are in stock
    return [r for r in results if r.QtyOnHand > 0]
