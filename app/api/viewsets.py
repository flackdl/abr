from rest_framework import viewsets, status
from rest_framework.response import Response
from app.models import Order, OrderPart
from app.api.serializers import OrderSerializer, OrderPartSerializer


class OrderViewset(viewsets.ModelViewSet):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    filter_fields = ('arrived',)

    def create(self, request, *args, **kwargs):
        # if adding parts and a vendor/order_id combination already exists, assign the the parts to it instead
        existing_vendor_order = Order.objects.filter(vendor=request.data.get('vendor'), order_id=request.data.get('order_id'))
        if 'order_parts' in request.data and existing_vendor_order.exists():
            serializer = OrderSerializer(data=request.data, instance=existing_vendor_order[0])
            serializer.is_valid(raise_exception=True)
            serializer.instance.description = '{}\n\nDescription updated when parts were added to order:\n\n{}'.format(
                serializer.instance.description,
                request.data.get('description'),
            )
            serializer.instance.save()
            self.assign_parts(serializer)
            headers = self.get_success_headers(serializer.data)
            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
        return super(OrderViewset, self).create(request, *args, **kwargs)

    def perform_create(self, serializer):
        """
        :type serializer: ModelSerializer
        """
        # save and then attach parts to the order
        super(OrderViewset, self).perform_create(serializer)
        if 'order_parts' in serializer.initial_data:
            self.assign_parts(serializer)

    @staticmethod
    def assign_parts(serializer):
        order_parts_data = serializer.initial_data['order_parts']
        # attach the order instance to each estimate/part record
        for estimate_part in order_parts_data:
            estimate_part['order'] = serializer.instance.id
        order_parts = OrderPartSerializer(data=order_parts_data, many=True)
        order_parts.is_valid(raise_exception=True)
        order_parts.save()


class OrderPartsViewset(viewsets.ModelViewSet):
    queryset = OrderPart.objects.all()
    serializer_class = OrderPartSerializer
