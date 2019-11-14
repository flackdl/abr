FROM ubuntu:18.04

# update and install dependencies
RUN apt-get update && \
    apt-get install -y \
        wget \
        python3-pip \
        python3-dev \
        python3-setuptools \
        python3-cairo \
        build-essential \
        libpq-dev \
        libffi-dev \
        libxml2-dev \
        libxslt1-dev \
        libz-dev \
        libpango1.0-0 \
        && true

# add app
ADD . /app/
WORKDIR /app

# install python dependencies
RUN pip3 install --upgrade pip
RUN pip3 install -r requirements.txt

# collect static files
RUN mkdir ng-assets
RUN python3 manage.py collectstatic --noinput

# run wsgi app
CMD gunicorn -w 3 --timeout 20 -b :${PORT:-80} abr.wsgi
