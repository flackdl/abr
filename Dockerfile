FROM ubuntu:14.04

# update and install dependencies
RUN apt-get update && \
    apt-get install -y \
        wget \
        python-pip \
        python-dev \
        gunicorn \
        build-essential \
        python-cairo \
        libffi-dev \
        libxml2-dev \
        libxslt1-dev \
        libz-dev \
        libpango1.0-0

# upgrade easy setup
RUN wget https://bootstrap.pypa.io/ez_setup.py -O - | python

# upgrade pip
RUN pip install --upgrade setuptools pip

# add app
ADD old /app/
WORKDIR /app

# install python dependencies
RUN pip install -qr /app/requirements.txt

# run flask wsgi app
CMD gunicorn -w 4 app:app
