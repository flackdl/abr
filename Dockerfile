FROM ubuntu:14.04

# update and install dependencies
RUN apt-get update && \
    apt-get install -y \
        wget \
        python-pip python-dev \
        build-essential \
        python-cairo \
        libffi-dev \
        libxml2-dev libxslt1-dev \
        libz-dev \
        libpango1.0-0 \
        & rm -rf /var/lib/apt/lists/*

# upgrade easy setup
RUN wget https://bootstrap.pypa.io/ez_setup.py -O - | python

# add app
ADD . /app/
WORKDIR /app

# install python dependencies
RUN pip install -qr /app/requirements.txt

# run flask wsgi app
CMD python /app/app.py