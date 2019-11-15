from django.conf.urls import url, include
from rest_framework import routers
from app.api import viewsets, views

router = routers.DefaultRouter()
router.register(r'orders', viewsets.OrderViewset)
router.register(r'orders-parts', viewsets.OrderPartsViewset)

urlpatterns = [
    url(r'^', include(router.urls)),
    url(r'customers', views.CustomersView.as_view())
]