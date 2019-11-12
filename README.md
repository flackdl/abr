## Anywhere Bicycle Repair web apps

### Print labels from QuickBooks inventory

A web app that prints labels (pdf) via QuickBooks inventory.  It uses [WeasyPrint](https://github.com/Kozea/WeasyPrint) for the pdf generation and [python-quickbooks](https://github.com/sidecars/python-quickbooks/) for the api.

There's a `Dockerfile` which builds all the dependencies and can be deployed to any container host provider.

QuickBooks authentication details need to be provided via environment variables.

### Bike estimate schedule

A dynamic listing of all active/complete/pending repairs

### Estimate orders and parts

Supports the management/tracking of vendor orders.


#### Deployment Notes

*Deploy to Heroku*

    # push image
    heroku container:push -a XXX web
    
    # trigger a release 
    heroku container:release -a XXX web
  
*Capture auth values from production redis server* (allows dev instance to piggy back on authenticated session)

    heroku redis:cli -a XXX -c XXX
    mget access_token realm_id
 
*Insert production auth values into dev redis instance*

    docker-compose exec redis redis-cli mset access_token @@@ realm_id @@@
    
*Init App*

    # activate virtual env
    workon abr
    
    # create initial tables
    python manage.py migrate
    
    # create super user
    python manage.py createsuperuser
    
    # create default user with permissions
    python manage.py init


#### Developing notes

To test production settings locally, you need to add *abr-dev.com* to `/etc/hosts` since QBO doesn't allow "localhost" callbacks for the oauth process.

Run a local ssl server:

    python manage.py runsslserver abr-dev.com:8080
