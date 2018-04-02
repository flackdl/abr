from rest_framework import viewsets
from app.models import Order, OrderPart
from app.api.serializers import OrderSerializer, OrderPartSerializer


class OrderViewset(viewsets.ModelViewSet):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer

    def perform_create(self, serializer):
        """
        :rtype serializer: ModelSerializer
        """
        super(OrderViewset, self).perform_create(serializer)
        estimates_parts_data = serializer.initial_data.get('estimates_parts')
        # attach the order instance to each estimate/part record
        for estimate_part in estimates_parts_data:
            estimate_part['order'] = serializer.instance.id
        estimates_parts = OrderPartSerializer(data=estimates_parts_data, many=True)
        estimates_parts.is_valid(raise_exception=True)
        estimates_parts.save()


class OrderPartsViewset(viewsets.ModelViewSet):
    queryset = OrderPart.objects.all()
    serializer_class = OrderPartSerializer
    filter_fields = ('order__id', 'order__arrived')

