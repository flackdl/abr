## Anywhere Bicycle Repair web apps
A web application fully integrated with QuickBooks Online to manage ABR's bike repair shop.

### Estimate Wizard
A Single Page Application that guides the staff through the entire estimate process for bike repair service.  

### Print labels from QuickBooks inventory

A web app that prints labels (pdf) via QuickBooks inventory.  It uses [WeasyPrint](https://github.com/Kozea/WeasyPrint) for the pdf generation and [python-quickbooks](https://github.com/sidecars/python-quickbooks/) for the api.

There's a `Dockerfile` which builds all the dependencies and can be deployed to any container host provider.

QuickBooks authentication details need to be provided via environment variables.

### Bike estimate schedule

A dynamic listing of all active/complete/pending repairs

### Estimate orders and parts

Supports the management & tracking of vendor orders.


#### Deployment Notes

##### Initial Steps

Copy/create the `.env.template` file to `.env` which `docker-compose.yml` reads.

    cp .env.template .env
    
Then edit `.env` accordingly.

##### Deploy

Login to VPS and run:

    # pull master
    git pull origin master
    
    # build/rebuild app and run abr
    docker-compose up -d --build --force-recreate abr

#### Helpers
    
    # create super user
    python manage.py createsuperuser

#### Developing notes

To test production settings locally:
- add *abr-dev.com* to `/etc/hosts` since QBO doesn't allow "localhost" callbacks for the oauth process
- supply production environment variables for redis url, qbo client & secret

Define production env vars:

    export QBO_CLIENT_ID=XXX
    export QBO_CLIENT_SECRET=XXX
    export REDIS_URL=redis://XXX

Run local ssl server:

    python manage.py runsslserver abr-dev.com:8080
