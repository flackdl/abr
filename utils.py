def get_client():
    return QuickBooks(
        sandbox=True,
        consumer_key=secret.production_key,
        consumer_secret=secret.production_secret,
        access_token=session['access_token'],
        access_token_secret=session['access_token_secret'],
        company_id=session['realm_id']
    )
    
    
def get_html(bill_id):
    client = get_client()
    bill = Bill.get(int(bill_id), qb=client)
    bill = json.loads(bill.to_json())
    attach_prices(bill, client)
    context = {
        'bill': bill,
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
    
    
