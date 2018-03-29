from rest_framework import viewsets
from app.models import Order, OrderEstimatePart
from app.api.serializers import OrderSerializer, OrderEstimatePartSerializer


class OrderViewset(viewsets.ModelViewSet):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer


class OrderEstimatePartsViewset(viewsets.ModelViewSet):
    queryset = OrderEstimatePart.objects.all()
    serializer_class = OrderEstimatePartSerializer

