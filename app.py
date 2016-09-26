import os
from cStringIO import StringIO
from flask import render_template, render_template_string, Response
from weasyprint import HTML
from flask import Flask, request
from quickbooks import QuickBooks
import secret  # not in version control. should define token, key & secret

app = Flask(__name__)

@app.route('/')
def login():
    client = QuickBooks(
        sandbox=True,
        consumer_key=secret.production_key,
        consumer_secret=secret.production_secret,
        callback_url='http://%s/callback' % request.host,
    )
    authorize_url = client.get_authorize_url()
    request_token = client.request_token
    return render_template('login.html', authorize_url=authorize_url)
    
@app.route('/callback')
def callback():
    return request.args.get()
    
    
@app.route('/html/<int:po_id>')
def html(po_id):
    context = {
        'pos': [i for i in range(0, 10)],
    }
    return render_template('labels.html', **context)

    
@app.route('/pdf/<int:po_id>')
def pdf(po_id):
    pdf = StringIO()
    html = StringIO()
    context = {
        'pos': [i for i in range(0, 50)],
    }
    print(render_template('labels.html', **context))
    html.write(render_template('labels.html', **context))
    HTML(html).write_pdf(pdf)
    return Response(pdf.getvalue(), mimetype='application/pdf')

app.config['DEBUG'] = True
if __name__ == "__main__":
    app.run(host=os.getenv('IP', '0.0.0.0'), port=int(os.getenv('PORT', 8080)))