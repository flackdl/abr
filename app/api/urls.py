from django.conf.urls import url, include
from rest_framework import routers
from app.api import viewsets, views

router = routers.DefaultRouter()

# app endpoints
router.register(r'orders', viewsets.OrderViewSet)
router.register(r'orders-parts', viewsets.OrderPartsViewSet)
router.register(r'category', viewsets.CategoryViewSet)
router.register(r'category-prefix', viewsets.CategoryPrefixViewSet)

# qbo endpoints
router.register(r'customer', viewsets.CustomerQBOViewSet, basename='customer')
router.register(r'estimate', viewsets.EstimateQBOViewSet, basename='estimate')
router.register(r'inventory', viewsets.InventoryQBOViewSet, basename='inventory')
router.register(r'invoice', viewsets.InvoiceQBOViewSet, basename='invoice')
router.register(r'service', viewsets.ServiceQBOViewSet, basename='service')
router.register(r'preferences', viewsets.PreferencesQBOViewSet, basename='preferences')

urlpatterns = [
    url(r'^', include(router.urls)),
    url(r'settings', views.SettingsView.as_view()),
]
