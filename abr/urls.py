"""abr URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/1.11/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  url(r'^$', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  url(r'^$', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.conf.urls import url, include
    2. Add a URL to urlpatterns:  url(r'^blog/', include('blog.urls'))
"""
from django.conf.urls import url, include
from django.contrib import admin
from django.urls import path

from app import views
import app.api.urls

urlpatterns = [
    url(r'^admin/', admin.site.urls),
    url(r'^$', views.dashboard, name='dashboard'),
    url(r'^callback$', views.callback, name='callback'),
    url(r'^input$', views.input, name='input'),
    url(r'^login$', views.app_login, name='login'),
    url(r'^json$', views.to_json),
    url(r'^html$', views.html),
    url(r'^pdf$', views.pdf, name='pdf'),
    url(r'^single-print-all-items$', views.single_print_all_items, name='single_print_all_items'),
    url(r'^json/estimates$', views.json_estimates, name='json-estimates'),
    url(r'^json/inventory-items$', views.json_inventory_items, name='json-inventory-items'),
    url(r'^estimates$', views.estimates, name='estimates'),
    url(r'^parts$', views.parts, name='parts'),
    url(r'^purge-orders$', views.purge_orders, name='purge-orders'),
    url(r'^api/', include(app.api.urls)),
    url(r'^ng/$', views.ng, name='ng'),
    url(r'^clear-cache/$', views.clear_cache, name='clear-cache'),
]
