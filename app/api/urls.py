from django.conf.urls import url, include
from rest_framework import routers
from app.api import viewsets

router = routers.DefaultRouter()
router.register(r'orders', viewsets.OrderViewset)
router.register(r'orders-estimate-parts', viewsets.OrderEstimatePartsViewset)

# Wire up our API using automatic URL routing.
# Additionally, we include login URLs for the browsable API.
urlpatterns = [
    url(r'^', include(router.urls)),
]