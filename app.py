import os
from cStringIO import StringIO
from flask import render_template, render_template_string, Response
from weasyprint import HTML
from flask import Flask

app = Flask(__name__)

@app.route('/')
def hello():
    return 'Hello World'
    
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
app.run(host=os.getenv('IP', '0.0.0.0'), port=int(os.getenv('PORT', 8080)))