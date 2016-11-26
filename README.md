### Print labels from QuickBooks inventory

A simple Flask app that prints labels via QuickBooks inventory.  It uses [WeasyPrint] (https://github.com/Kozea/WeasyPrint) for the pdf generation and [python-quickbooks] (https://github.com/sidecars/python-quickbooks/) for the api.

There's a `Dockerfile` which builds all the dependencies and can be deployed to any container host provider.

QuickBooks authentication details need to be provided via environment variables or in a `secret.py` module.


#### Deployment Notes
*Deploy to Heroku*
- push to git
- wait for automated build at [Docker Hub](https://hub.docker.com/r/flackdl/abr/builds/) to complete
- pull docker image
  - `docker pull flackdl/abr`
- tag docker image
  - `docker tag flackdl/abr registry.heroku.com/abr-labels/web`
- push docker image to heroku
  - `docker push registry.heroku.com/abr-labels/web`