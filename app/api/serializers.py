from rest_framework import serializers
from app.models import Order, OrderPart


class OrderPartSerializer(serializers.ModelSerializer):

    class Meta:
        model = OrderPart
        fields = '__all__'


class OrderSerializer(serializers.ModelSerializer):
    parts = OrderPartSerializer(many=True, source='orderpart_set', required=False)

    class Meta:
        model = Order
        fields = '__all__'
