### Print labels from QuickBooks inventory

A simple Flask app that prints labels via QuickBooks inventory.  It uses [WeasyPrint] (https://github.com/Kozea/WeasyPrint) for the pdf generation and [python-quickbooks] (https://github.com/sidecars/python-quickbooks/) for the api.

There's a `Dockerfile` which builds all the dependencies and can be deployed to any container host provider.

QuickBooks authentication details need to be provided via environment variables or in a `secret.py` module.
