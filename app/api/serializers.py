from rest_framework import serializers
from app.models import Order, OrderEstimatePart


class OrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = '__all__'


class OrderEstimatePartSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderEstimatePart
        fields = '__all__'
