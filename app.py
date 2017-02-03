import os
import json
import logging
from functools import wraps
from weasyprint import HTML
from cStringIO import StringIO
from flask import Flask, request
from quickbooks import QuickBooks
from quickbooks.objects.bill import Bill
from quickbooks.objects.item import Item
from quickbooks.objects.estimate import Estimate
from quickbooks.exceptions import AuthorizationException, QuickbooksException, UnsupportedException, GeneralException, ValidationException, SevereException
from flask import render_template, render_template_string, Response, session, url_for, redirect, jsonify, send_from_directory
from datetime import datetime, timedelta
# quickbooks auth values
try:
    # not in version control. should define token, key & secret
    import secret
except Exception:
    # otherwise, expects from env
    class S(object): pass
    secret = S()
    secret.app_secret = os.environ.get('app_secret')
    secret.production_token = os.environ.get('production_token')
    secret.production_key = os.environ.get('production_key')
    secret.production_secret = os.environ.get('production_secret')
    
app = Flask(__name__)
COLS = 3
MAX_RESULTS = 1000


# decorator to handle auth exceptions
def quickbooks_auth(f):
   @wraps(f)
   def wrapper(*args, **kwargs):
        
       # not authenticated so redirect them
       if 'access_token' not in session:
               
           client = QuickBooks(
               sandbox=True,
               consumer_key=secret.production_key,
               consumer_secret=secret.production_secret,
               callback_url='http://%s/callback' % request.host,
           )
           
           # store for future use
           session['authorize_url'] = client.get_authorize_url()
           session['request_token'] = client.request_token
           session['request_token_secret'] = client.request_token_secret
           
           return redirect(session['authorize_url'])
    
       try:
           return f(*args, **kwargs)
       except (AuthorizationException) as e:
           log('auth exception, clearing session and redirecting (%s)' % e) 
           if 'access_token' in session:
               del session['access_token']
           # json requests should return contextual data vs getting redirected
           if request.headers.get('content-type') == 'application/json':
               return jsonify({'success': False, 'reason': 'authentication'})
           return redirect(url_for('dashboard'))
       except (UnsupportedException, GeneralException, ValidationException, SevereException) as e:
           log('qb exception')
           log(e)
           raise e
       except Exception as e:
           log('other exception')
           log(e)
           raise e
   return wrapper
   
   
@app.route('/static/<path:path>')
def send_static(path):
    last_modified = datetime.now() - timedelta(days=10)
    return send_from_directory('static', path, cache_timeout=0, last_modified=last_modified)


def get_client():
    return QuickBooks(
        sandbox=True,
        consumer_key=secret.production_key,
        consumer_secret=secret.production_secret,
        access_token=session.get('access_token'),
        access_token_secret=session.get('access_token_secret'),
        company_id=session.get('realm_id'),
    )
    
    
def multiply_items(items):
    expanded = []
    # conditionally only print one of each item vs item's actual quantity when expanding
    single_print = request.args.get('single_print', '')
    for item in items:
        if 'ItemBasedExpenseLineDetail' in item:
            quantity = 1 if single_print else item['ItemBasedExpenseLineDetail']['Qty']
            expanded.extend(quantity * [item]) 
    return expanded
    
    
def get_html(bill_id):
    css = request.args.get('css')
    client = get_client()
    bill = Bill.get(int(bill_id), qb=client)
    bill = json.loads(bill.to_json())
    attach_prices(bill, client)
    items = multiply_items(bill['Line'])
    context = {
        'rows': (items[i:i+COLS] for i in xrange(0, len(items), COLS)),
        'css': css,
    }
    return render_template('labels.html', **context)
    
    
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
    
    
@app.route('/')
@quickbooks_auth
def dashboard():
    import bmemcached
    mc = bmemcached.Client(os.environ.get('MEMCACHEDCLOUD_SERVERS').split(','), os.environ.get('MEMCACHEDCLOUD_USERNAME'), os.environ.get('MEMCACHEDCLOUD_PASSWORD'))
    #r = mc.set('msg', 'HI')
    msg = mc.get('msg')
    return render_template('dashboard.html', msg=msg)
    
    
@app.route('/callback')
def callback():
    client = QuickBooks(
        sandbox=True,
        consumer_key=secret.production_key,
        consumer_secret=secret.production_secret,
    )
    
    client.authorize_url = session.get('authorize_url')
    client.request_token = session.get('request_token')
    client.request_token_secret = session.get('request_token_secret')
    client.set_up_service()
    client.get_access_tokens(request.args['oauth_verifier'])
    
    # store for future use
    session['realm_id'] = request.args['realmId']
    session['access_token'] = client.access_token
    session['access_token_secret'] = client.access_token_secret
    
    return redirect(url_for('dashboard'))
    
    
@app.route('/input')
@quickbooks_auth
def input():
    return render_template('input.html', title='Print Labels')
    
    
@app.route('/json')
@quickbooks_auth
def to_json():
    client = get_client()
    bill_id = request.args.get('bill_id')
    bill = Bill.get(int(bill_id), qb=client)
    bill = json.loads(bill.to_json())
    attach_prices(bill, client)
    return jsonify(bill)
    
    
@app.route('/html')
@quickbooks_auth
def html():
    bill_id = request.args.get('bill_id')
    return get_html(bill_id)

    
@app.route('/pdf')
@quickbooks_auth
def pdf():
    html = StringIO()
    pdf = StringIO()
    bill_id = request.args.get('bill_id')
    try:
        html.write(get_html(bill_id))
    except (ValueError, TypeError) as e:
        log('get_html exception') 
        log(e) 
        return render_template('input.html', error='Could not retrieve bill id#%s' % bill_id)
    HTML(html).write_pdf(pdf)
    return Response(pdf.getvalue(), mimetype='application/pdf')
    
    
def get_items_in_stock(pos):
    client = get_client()
    # limit to items that are in stock
    results = Item.query('SELECT * from Item WHERE Active = true STARTPOSITION %s MAXRESULTS %s' % (pos, MAX_RESULTS), qb=client)
    return [r for r in results if r.QtyOnHand > 0]
    
    
@app.route('/single-print-all-items')
@quickbooks_auth
def single_print_all_items():
    
    # page through all items in stock that have a positive quantity
    results = get_items_in_stock(1)
    items = []
    page = 0
    while results:
        page += 1
        position = (page * MAX_RESULTS) + 1
        items.extend(results)
        results = get_items_in_stock(position)
    items = [json.loads(item.to_json()) for item in items]
    context = {
        'rows': (items[i:i+COLS] for i in xrange(0, len(items), COLS)),
    }
    rendered = render_template('labels.html', **context).encode('utf-8')
    
    # write pdf
    html = StringIO()
    pdf = StringIO()
    html.write(rendered)
    HTML(html).write_pdf(pdf)
    return Response(pdf.getvalue(), mimetype='application/pdf')
    

def estimate_has_tag_number(estimate):
    for custom_field in estimate.get('CustomField', []):
        if custom_field['Name'] == 'Tag #' and custom_field['StringValue']:
            return True
    return False
    
    
@app.route('/json/estimates')
@quickbooks_auth
def json_estimates():
    client = get_client()
    
    # get recent estimates
    query = "SELECT * FROM Estimate WHERE TxnDate >= '%s' ORDERBY TxnDate ASC MAXRESULTS %s" % (
            (datetime.now() - timedelta(weeks=8)).date().isoformat(), MAX_RESULTS)
            
    estimates = [json.loads(e.to_json()) for e in Estimate.query(query, qb=client)]
    # remove "Closed" estimates without a "Tag #" which indicates the bike has been serviced and picked up
    estimates = [e for e in estimates if not (e['TxnStatus'] == 'Closed' and not estimate_has_tag_number(e))]
    
    return jsonify({'success': True, 'estimates': estimates})
    
    
@app.route('/estimates')
@quickbooks_auth
def estimates():
    return render_template('estimates.html', title='In-House Repairs')
    
    
def log(m):
   logging.info('===============') 
   logging.info(m) 
   logging.info('===============') 
   print '==============='
   print m
   print '==============='


app.config['DEBUG'] = True
app.secret_key = secret.app_secret
if __name__ == "__main__":
    app.run(host=os.getenv('IP', '0.0.0.0'), port=int(os.getenv('PORT', 8080)))
