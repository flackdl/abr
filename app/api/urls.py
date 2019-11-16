from django.conf.urls import url, include
from rest_framework import routers
from app.api import viewsets

router = routers.DefaultRouter()

# app endpoints
router.register(r'orders', viewsets.OrderViewSet)
router.register(r'orders-parts', viewsets.OrderPartsViewSet)

# qbo endpoints
router.register(r'customer', viewsets.CustomerQBOViewSet, basename='customer')
router.register(r'estimate', viewsets.EstimateQBOViewSet, basename='estimate')
router.register(r'inventory', viewsets.InventoryQBOViewSet, basename='inventory')
router.register(r'service', viewsets.ServiceQBOViewSet, basename='service')

urlpatterns = [
    url(r'^', include(router.urls)),
]
