#!/usr/bin/env bash

# run init
python3 manage.py init

# build/migrate tables
python3 manage.py migrate

# start web server
gunicorn -w 3 --timeout 20 -b :${PORT:-80} abr.wsgi
