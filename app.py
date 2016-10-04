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
from quickbooks.exceptions import AuthorizationException, QuickbooksException, UnsupportedException, GeneralException, ValidationException, SevereException
from flask import render_template, render_template_string, Response, session, url_for, redirect, jsonify
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


# decorator to handle auth exceptions
def quickbooks_auth(f):
   @wraps(f)
   def wrapper(*args, **kwargs):
       try:
           return f(*args, **kwargs)
       except AuthorizationException:
           logging.info('auth exception, clearing session and redirecting') 
           if 'access_token' in session:
               del session['access_token']
           return redirect(url_for('index'))
       except (UnsupportedException, GeneralException, ValidationException, SevereException) as e:
           logging.info('qb exception')
           logging.info(e)
           raise e
       except Exception as e:
           logging.info('other exception')
           logging.info(e)
           raise e
   return wrapper
   
   
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
    for item in items:
        if 'ItemBasedExpenseLineDetail' in item:
            expanded.extend(item['ItemBasedExpenseLineDetail']['Qty'] * [item]) 
    return expanded
    
    
def get_html(bill_id):
    COLS = 3
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
                line['Price'] = item.get('UnitPrice')
                break
    return bill
    
    
@app.route('/')
def index():
    
    # already authenticated
    if 'access_token' in session:
        return redirect(url_for('input'))
        
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
    return render_template('login.html', authorize_url=session['authorize_url'])
    
    
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
    
    return redirect(url_for('input'))
    
    
@app.route('/input')
@quickbooks_auth
def input():
    return render_template('input.html')
    
    
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
        logging.info('get_html exception') 
        logging.info(e) 
        return render_template('input.html', error='Could not retrieve bill id#%s' % bill_id)
    HTML(html).write_pdf(pdf)
    return Response(pdf.getvalue(), mimetype='application/pdf')
    

app.config['DEBUG'] = True
app.secret_key = secret.app_secret
if __name__ == "__main__":
    app.run(host=os.getenv('IP', '0.0.0.0'), port=int(os.getenv('PORT', 8080)))