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
from django.conf.urls import url
from django.contrib import admin
from app import views

urlpatterns = [
    url(r'^admin/', admin.site.urls),
    url(r'^$', views.dashboard, name='dashboard'),
    url(r'^callback$', views.callback),
    url(r'^input$', views.input, name='input'),
    url(r'^login$', views.login, name='login'),
    url(r'^json$', views.to_json),
    url(r'^html$', views.html),
    url(r'^pdf$', views.pdf, name='pdf'),
    url(r'^json/single-print-all-items$', views.json_single_print_pages),
    url(r'^single-print-all-items$', views.single_print_all_items, name='json_single_print_pages'),
    url(r'^json/estimates$', views.json_estimates),
    url(r'^estimates$', views.estimates, name='estimates'),
    url(r'^needed-parts$', views.needed_parts, name='needed_parts'),
]
