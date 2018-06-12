import json
from cStringIO import StringIO
from django.contrib import messages
from django.contrib.auth import authenticate, login
from django.http import JsonResponse, HttpResponse
from django.template.loader import render_to_string
from django.urls import reverse
from weasyprint import HTML
from quickbooks import QuickBooks
from quickbooks.objects.bill import Bill
from quickbooks.objects.estimate import Estimate
from datetime import datetime, timedelta
from django.shortcuts import render, redirect
from django.conf import settings

from app.models import OrderPart, Order
from app.utils import (
    quickbooks_auth, get_redis_client, get_key, log, get_qbo_client, attach_prices,
    get_inventory_items, estimate_has_tag_number, get_html, QBO_DEFAULT_ARGS,
    json_cache)


@quickbooks_auth
def dashboard(request):
    return render(request, 'dashboard.html')


def callback(request):
    client = QuickBooks(
        consumer_key=settings.QBO_PRODUCTION_KEY,
        consumer_secret=settings.QBO_PRODUCTION_SECRET,
        **QBO_DEFAULT_ARGS
    )
    mc = get_redis_client()

    client.authorize_url = mc.get(get_key('authorize_url', request))
    client.request_token = mc.get(get_key('request_token', request))
    client.request_token_secret = mc.get(get_key('request_token_secret', request))
    client.set_up_service()
    client.get_access_tokens(request.GET['oauth_verifier'])

    # store for future use
    mc.set('realm_id', request.GET['realmId'])
    mc.set('access_token', client.access_token)
    mc.set('access_token_secret', client.access_token_secret)

    return redirect(reverse('dashboard'))


@quickbooks_auth
def input(request):
    return render(request, 'input.html', {'title': 'Print Labels', 'tab': 'labels'})


def app_login(request):
    context = {
        'title': 'Login',
    }

    # verify credentials
    if request.method == 'POST':
        user = authenticate(request, username=settings.POS_USER, password=request.POST.get('password'))
        if user is not None:
            login(request, user)
            log('successfully logged in')
            return redirect(reverse('dashboard'))
        else:
            context['error'] = 'Incorrect password'
            log('incorrect logged in')

    return render(request, 'login.html', context)


@quickbooks_auth
def to_json(request):
    client = get_qbo_client()
    bill_id = request.GET.get('bill_id')
    bill = Bill.get(int(bill_id), qb=client)
    bill = json.loads(bill.to_json())
    attach_prices(bill, client)
    return JsonResponse(bill)


@quickbooks_auth
def html(request):
    bill_id = request.GET.get('bill_id')
    return get_html(request, bill_id)


@quickbooks_auth
def pdf(request):
    html = StringIO()
    pdf = StringIO()
    bill_id = request.GET.get('bill_id')
    try:
        html.write(get_html(request, bill_id))
    except (ValueError, TypeError) as e:
        log('get_html exception')
        log(e)
        return render(request, 'input.html', {'error': 'Could not retrieve bill id#%s' % bill_id})
    HTML(html).write_pdf(pdf)
    return HttpResponse(pdf.getvalue(), content_type='application/pdf')


@quickbooks_auth
def single_print_all_items(request):

    try:
        items = json.loads(request.POST['items'])['items']
    except Exception as e:
        messages.warning(request, str(e))
        return redirect(reverse('input'))

    context = {
        'rows': (items[i:i+settings.PRINT_LABEL_COLS] for i in range(0, len(items), settings.PRINT_LABEL_COLS)),
    }
    rendered = render_to_string(request, 'labels.html', context).encode('utf-8')

    # write pdf
    html = StringIO()
    pdf = StringIO()
    html.write(rendered)
    HTML(html).write_pdf(pdf)
    return HttpResponse(pdf.getvalue(), content_type='application/pdf')


@quickbooks_auth
def estimates(request):
    return render(request, 'estimates.html', {'title': 'In-House Repairs', 'tab': 'estimates'})


@quickbooks_auth
def parts(request):
    return render(request, 'parts.html', {'title': 'Parts', 'tab': 'parts'})


@quickbooks_auth
@json_cache
def json_estimates(request):
    client = get_qbo_client()

    # get recent estimates
    query = "SELECT * FROM Estimate WHERE TxnDate >= '%s' ORDERBY TxnDate ASC MAXRESULTS %s" % (
        (datetime.now() - timedelta(weeks=settings.ESTIMATE_AGE_WEEKS)).date().isoformat(), settings.QBO_MAX_RESULTS)

    # remove "Closed" estimates without a "Tag #" which indicates the bike has been serviced and picked up
    results = [json.loads(e.to_json()) for e in Estimate.query(query, qb=client)]
    results = [e for e in results if not (e['TxnStatus'] == 'Closed' and not estimate_has_tag_number(e))]

    return JsonResponse({'success': True, 'estimates': results})


@quickbooks_auth
@json_cache
def json_inventory_items(request):
    page = int(request.GET.get('page') or 1)
    all_stock = 'all_stock' in request.GET

    # build query position from the page number
    position = (page * settings.QBO_MAX_RESULTS) + 1

    # get all inventory items (conditionally in stock)
    results = get_inventory_items(position, all_stock=all_stock)
    items = [json.loads(item.to_json()) for item in results]

    return JsonResponse({"items": items})


def purge_orders(request):
    client = get_qbo_client()

    # get recent estimates
    query = "SELECT * FROM Estimate WHERE TxnDate >= '%s' ORDERBY TxnDate DESC MAXRESULTS %s" % (
        (datetime.now() - timedelta(weeks=settings.ESTIMATE_AGE_WEEKS)).date().isoformat(), settings.QBO_MAX_RESULTS)

    # filter to "Closed" and "Accepted"
    results = [json.loads(e.to_json()) for e in Estimate.query(query, qb=client)]
    results = [e for e in results if e['TxnStatus'] in ['Closed', 'Accepted']]

    orders_to_purge = []
    parts_to_purge = []
    for result in results:
        # verify the DocNumber is an integer
        if not result['DocNumber'] or not result['DocNumber'].isdigit():
            continue

        # find all parts for this "DocNumber" (i.e estimate_id)
        order_parts = OrderPart.objects.filter(estimate_id=result['DocNumber'])
        order_ids = set()
        for part in order_parts:
            order_ids.add(part.order.id)
            parts_to_purge.append({
                "qbo_estimate_id": result['Id'],
                "part_id": part.id,
                "order_id": part.order.id,
                "qbo_DocNumber": part.estimate_id,
            })
            # TODO
            #part.delete()

        # remove all orders without any associated parts
        orders = Order.objects.filter(order_id__in=order_ids)
        for order in orders:
            if not order.orderpart_set.exists():
                orders_to_purge.append({
                    "order_id": order.id,
                })
                # TODO
                #order.delete()

    return JsonResponse({
        'parts_to_purge': parts_to_purge,
        'orders_to_purge': orders_to_purge,
    })
