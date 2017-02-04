import os
import logging
import bmemcached


def log(m):
   logging.info('===============') 
   logging.info(m) 
   logging.info('===============') 
   print '==============='
   print m
   print '==============='


def get_client():
    # qbo client
    return QuickBooks(
        sandbox=True,
        consumer_key=secret.production_key,
        consumer_secret=secret.production_secret,
        access_token=session.get('access_token'),
        access_token_secret=session.get('access_token_secret'),
        company_id=session.get('realm_id'),
    )

    
def get_mc():
    # memcache client
    return bmemcached.Client(
        os.environ.get('MEMCACHEDCLOUD_SERVERS').split(','),
        os.environ.get('MEMCACHEDCLOUD_USERNAME'),
        os.environ.get('MEMCACHEDCLOUD_PASSWORD'))