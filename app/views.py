# -*- coding: utf-8 -*-

import json
from cStringIO import StringIO
from dateutil import parser
from django.contrib import messages
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
from app.utils import (
    quickbooks_auth, get_mc_client, get_key, log, get_client, attach_prices,
    get_inventory_items, estimate_has_tag_number, get_html,
)


@quickbooks_auth
def dashboard(request):
    return render(request, 'dashboard.html')


def callback(request):
    client = QuickBooks(
        #sandbox=True,
        consumer_key=settings.PRODUCTION_KEY,
        consumer_secret=settings.PRODUCTION_SECRET,
    )
    mc = get_mc_client()

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


def login(request):
    context = {
        'title': 'Login',
    }
    # verify credentials
    if request.method == 'POST':

        if request.POST['password'] == settings.PASSWORD:
            log('successfully logged in')
            request.session['authenticated'] = True
            return redirect(reverse('dashboard'))
        else:
            context['error'] = 'Incorrect password'
            log('incorrect logged in')

    return render(request, 'login.html', context)


@quickbooks_auth
def to_json(request):
    client = get_client()
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
        'rows': (items[i:i+settings.COLS] for i in range(0, len(items), settings.COLS)),
    }
    rendered = render_to_string(request, 'labels.html', context).encode('utf-8')

    # write pdf
    html = StringIO()
    pdf = StringIO()
    html.write(rendered)
    HTML(html).write_pdf(pdf)
    return HttpResponse(pdf.getvalue(), content_type='application/pdf')


@quickbooks_auth
def json_estimates(request):
    return JsonResponse({'success': True, 'estimates': json.loads(open('estimates.json').read())['estimates']})  # TODO
    mc = get_mc_client()
    client = get_client()
    utcnow = datetime.utcnow()

    cached = mc.get('estimates')
    if cached:
        log('has cache')
        try:
            cached = json.loads(cached)
            # cache is fresh
            if cached.get('estimates') and cached.get('date') and (parser.parse(cached.get('date')) + timedelta(seconds=settings.ESTIMATE_QUERY_SECONDS)) >= utcnow:
                log('cache is fresh')
                return JsonResponse({'success': True, 'estimates': cached['estimates']})
        except Exception as e:
            log('exception getting cache: %s' % e)

    log('not cached')

    # get recent estimates
    query = "SELECT * FROM Estimate WHERE TxnDate >= '%s' ORDERBY TxnDate ASC MAXRESULTS %s" % (
        (datetime.now() - timedelta(weeks=settings.ESTIMATE_AGE_WEEKS)).date().isoformat(), settings.MAX_RESULTS)

    # remove "Closed" estimates without a "Tag #" which indicates the bike has been serviced and picked up
    estimates = [json.loads(e.to_json()) for e in Estimate.query(query, qb=client)]
    estimates = [e for e in estimates if not (e['TxnStatus'] == 'Closed' and not estimate_has_tag_number(e))]

    log('caching')
    mc.set('estimates', json.dumps({'estimates': estimates, 'date': utcnow.isoformat()}))

    return JsonResponse({'success': True, 'estimates': estimates})


@quickbooks_auth
def estimates(request):
    return render(request, 'estimates.html', {'title': 'In-House Repairs', 'tab': 'estimates'})


@quickbooks_auth
def needed_parts(request):
    return render(request, 'needed-parts.html', {'title': 'Needed Parts', 'tab': 'needed-parts'})


@quickbooks_auth
def json_inventory_items(request):
    page = int(request.GET.get('page') or 1)
    in_stock = 'in_stock' in request.GET

    # build query position from the page number
    position = (page * settings.MAX_RESULTS) + 1

    # get all inventory items (conditionally in stock)
    results = get_inventory_items(position, in_stock=in_stock)
    items = [json.loads(item.to_json()) for item in results]

    return JsonResponse({"items": items})
