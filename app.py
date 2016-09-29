import os
import json
from cStringIO import StringIO
from flask import render_template, render_template_string, Response, session, url_for, redirect, jsonify
from weasyprint import HTML
from flask import Flask, request
from quickbooks import QuickBooks
from quickbooks.objects.bill import Bill
from quickbooks.objects.item import Item
import secret  # not in version control. should define token, key & secret

app = Flask(__name__)

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
    
    client.authorize_url = session['authorize_url']
    client.request_token = session['request_token']
    client.request_token_secret = session['request_token_secret']
    client.set_up_service()
    client.get_access_tokens(request.args['oauth_verifier'])
    
    # store for future use
    session['realm_id'] = request.args['realmId']
    session['access_token'] = client.access_token
    session['access_token_secret'] = client.access_token_secret
    
    return redirect(url_for('input'))
    
    
@app.route('/input')
def input():
    return render_template('input.html')
    

def get_client():
    return QuickBooks(
        sandbox=True,
        consumer_key=secret.production_key,
        consumer_secret=secret.production_secret,
        access_token=session['access_token'],
        access_token_secret=session['access_token_secret'],
        company_id=session['realm_id']
    )
    
def multiply_items(items):
    expanded = []
    for item in items:
        if 'ItemBasedExpenseLineDetail' in item:
            expanded.extend(item['ItemBasedExpenseLineDetail']['Qty'] * [item]) 
    print expanded
    return expanded
    
    
def get_html(bill_id):
    client = get_client()
    bill = Bill.get(int(bill_id), qb=client)
    bill = json.loads(bill.to_json())
    attach_prices(bill, client)
    context = {
        'items': multiply_items(bill['Line']),
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
    
    
@app.route('/json')
def to_json():
    client = get_client()
    bill_id = request.args.get('bill_id')
    bill = Bill.get(int(bill_id), qb=client)
    bill = json.loads(bill.to_json())
    attach_prices(bill, client)
    return jsonify(bill)
    
    
@app.route('/html')
def html():
    bill_id = request.args.get('bill_id')
    return get_html(bill_id)

    
@app.route('/pdf')
def pdf():
    html = StringIO()
    pdf = StringIO()
    bill_id = request.args.get('bill_id')
    html.write(get_html(bill_id))
    HTML(html).write_pdf(pdf)
    return Response(pdf.getvalue(), mimetype='application/pdf')

app.config['DEBUG'] = True
app.secret_key = secret.app_secret
if __name__ == "__main__":
    app.run(host=os.getenv('IP', '0.0.0.0'), port=int(os.getenv('PORT', 8080)))