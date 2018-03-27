import json
import logging
import uuid
from functools import wraps

import redis
from django.conf import settings
from django.http import JsonResponse
from django.shortcuts import redirect
from django.template.loader import render_to_string
from django.urls import reverse
from quickbooks import QuickBooks
from quickbooks.exceptions import (
    AuthorizationException, UnsupportedException, GeneralException, ValidationException,
    SevereException,
)
from quickbooks.objects import Bill
from quickbooks.objects.item import Item


def get_key(key, request):
    return '%s:%s' % (request.session['uid'], key)


# decorator to handle auth exceptions
def quickbooks_auth(f):
    @wraps(f)
    def wrapper(request, *args, **kwargs):

        if not request.session.get('authenticated'):

            if request.META.get('content-type') == 'application/json':
                return JsonResponse({'success': False, 'reason': 'authentication'})

            return redirect(reverse('login'))

        if 'uid' not in request.session:
            request.session['uid'] = str(uuid.uuid4())

        mc = get_mc_client()

        # not authenticated with qbo
        if not mc.get('access_token'):

            log('no access token')

            client = QuickBooks(
                #sandbox=True,
                consumer_key=settings.PRODUCTION_KEY,
                consumer_secret=settings.PRODUCTION_SECRET,
                callback_url='http://%s/callback' % request.get_host(),
            )

            # store for future use
            authorize_url = client.get_authorize_url()
            mc.set(get_key('authorize_url', request), authorize_url)
            mc.set(get_key('request_token', request), client.request_token)
            mc.set(get_key('request_token_secret', request), client.request_token_secret)

            if request.META.get('content-type') == 'application/json':
                return JsonResponse({'success': False, 'reason': 'authentication'})

            return redirect(authorize_url)

        try:
            return f(request, *args, **kwargs)
        except AuthorizationException as e:
            # session appears to have expired to wipe token
            log('quickbooks exception, clearing token and redirecting (%s)' % e)
            mc.delete('access_token')
            # json requests should return contextual data vs getting redirected
            if request.META.get('content-type') == 'application/json':
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


def get_client():
    mc = get_mc_client()
    # qbo client
    return QuickBooks(
        #sandbox=True,
        consumer_key=settings.PRODUCTION_KEY,
        consumer_secret=settings.PRODUCTION_SECRET,
        access_token=mc.get('access_token'),
        access_token_secret=mc.get('access_token_secret'),
        company_id=mc.get('realm_id'),
    )


def get_mc_client():
    return redis.from_url(settings.REDIS_URL)


def log(m):
    logging.info(m)
    print(m)


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
    client = get_client()
    bill = Bill.get(int(bill_id), qb=client)
    bill = json.loads(bill.to_json())
    attach_prices(bill, client)
    single_print = request.GET.get('single_print', '')
    items = multiply_items(bill['Line'], single_print)
    context = {
        'rows': [items[i:i+settings.COLS] for i in range(0, len(items), settings.COLS)],
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


def get_inventory_items(pos, in_stock=True):
    client = get_client()
    results = Item.query('SELECT * from Item WHERE Active = true STARTPOSITION %s MAXRESULTS %s' % (pos, settings.MAX_RESULTS), qb=client)

    # conditionally limit items that are in stock
    if in_stock:
        return [r for r in results if r.QtyOnHand > 0]

    return results
