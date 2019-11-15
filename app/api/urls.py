from django.conf.urls import url, include
from rest_framework import routers
from app.api import viewsets

router = routers.DefaultRouter()
router.register(r'orders', viewsets.OrderViewSet)
router.register(r'orders-parts', viewsets.OrderPartsViewSet)
router.register(r'customer', viewsets.CustomerQBOViewSet, basename='customer')

urlpatterns = [
    url(r'^', include(router.urls)),
]
