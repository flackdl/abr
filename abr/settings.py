"""
Django settings for abr project.
"""

import os
import dj_database_url


# Build paths inside the project like this: os.path.join(BASE_DIR, ...)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ.get('SECRET_KEY', 'ssshhhh')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = 'DEBUG' in os.environ

ALLOWED_HOSTS = ['*']


# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'django_filters',
    'app',
    'sslserver',  # development ssl server
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'abr.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': ['templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
                'app.context_processors.processor',
            ],
        },
    },
]

WSGI_APPLICATION = 'abr.wsgi.application'


# Database
DATABASES = {
    'default': dj_database_url.config(default='postgres://postgres@localhost:5432/postgres'),
}


# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_L10N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/2.2/howto/static-files/

# url for static files
STATIC_URL = '/static/'
# location where files are collected
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
# additional locations the staticfiles app will traverse
STATICFILES_DIRS = [
    'ng-assets',
]

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.filebased.FileBasedCache',
        'LOCATION': '/tmp/django_cache',
    }
}

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework.authentication.SessionAuthentication',
    ),
    # Use Django's standard `django.contrib.auth` permissions
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.DjangoModelPermissions',
    ],
    'DEFAULT_FILTER_BACKENDS': (
        'django_filters.rest_framework.DjangoFilterBackend',
    ),
}

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        '': {
            'handlers': ['console'],
            'level': os.getenv('DJANGO_LOG_LEVEL', 'INFO'),
        },
    },
}


#
# custom app settings
#

POS_USER = os.environ.get('POS_USER', 'pos')
POS_PASSWORD = os.environ.get('POS_PASSWORD', 'cookie123')
MANAGER_USER = os.environ.get('MANAGER_USER', 'manager')
MANAGER_PASSWORD = os.environ.get('MANAGER_PASSWORD', 'cookie123')
QBO_CLIENT_ID = os.environ.get('QBO_CLIENT_ID')
QBO_CLIENT_SECRET = os.environ.get('QBO_CLIENT_SECRET')
QBO_MAX_RESULTS = 1000
REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379')
PRINT_LABEL_COLS = 3
ESTIMATE_AGE_WEEKS = int(os.environ.get('ESTIMATE_AGE_WEEKS', 20))
ESTIMATE_QUERY_SECONDS = int(os.environ.get('ESTIMATE_QUERY_SECONDS', 10))
INVENTORY_QUERY_SECONDS = int(os.environ.get('INVENTORY_QUERY_SECONDS', 60 * 60 * 8))
CACHE_LOCK_SECONDS = 60

AWS_ACCESS_KEY_ID = os.environ.get('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = os.environ.get('AWS_SECRET_ACCESS_KEY')
