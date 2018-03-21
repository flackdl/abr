"""abr URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/2.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path
from app import views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', views.dashboard, name='dashboard'),
    path('callback', views.callback),
    path('input', views.input, name='input'),
    path('login', views.login, name='login'),
    path('json', views.to_json),
    path('html', views.html),
    path('pdf', views.pdf, name='pdf'),
    path('json/single-print-all-items', views.json_single_print_pages),
    path('single-print-all-items', views.single_print_all_items, name='json_single_print_pages'),
    path('json/estimates', views.json_estimates),
    path('estimates', views.estimates, name='estimates'),
    path('needed-parts', views.needed_parts, name='needed_parts'),
]
