import json

from django.utils.decorators import method_decorator
from quickbooks.exceptions import ObjectNotFoundException
from quickbooks.objects import Customer, Estimate, Item
from rest_framework import viewsets, status, exceptions
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from app.models import Order, OrderPart
from app.api.serializers import OrderSerializer, OrderPartSerializer
from app.utils import get_qbo_client, get_callback_url, quickbooks_auth

GENERIC_VENDOR_IN_STOCK = 'IN STOCK'
GENERIC_VENDOR_QUOTE = 'QUOTE'


class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    filter_fields = ('arrived',)

    @staticmethod
    def _is_generic(vendor):
        return vendor in [GENERIC_VENDOR_IN_STOCK, GENERIC_VENDOR_QUOTE]

    def create(self, request, *args, **kwargs):
        # if adding parts and a vendor/order_id combination already exists, assign the the parts to it instead
        existing_vendor_order = Order.objects.filter(vendor=request.data.get('vendor'), order_id=request.data.get('order_id'))
        if 'order_parts' in request.data and existing_vendor_order.exists():
            serializer = OrderSerializer(data=request.data, instance=existing_vendor_order[0])
            serializer.is_valid(raise_exception=True)
            # if not a generic order, append to the description that parts were added
            if not self._is_generic(request.data['vendor']):
                serializer.instance.description = '{}\n\n[PART(S) ADDED TO ORDER]\n\n{}'.format(
                    serializer.instance.description,
                    request.data.get('description'),
                )
            serializer.instance.save()
            self.assign_parts(serializer)
            headers = self.get_success_headers(serializer.data)
            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
        return super(OrderViewSet, self).create(request, *args, **kwargs)

    def perform_create(self, serializer):
        """
        :type serializer: ModelSerializer
        """
        # save and then attach parts to the order
        super(OrderViewSet, self).perform_create(serializer)
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


class OrderPartsViewSet(viewsets.ModelViewSet):
    queryset = OrderPart.objects.all()
    serializer_class = OrderPartSerializer


@method_decorator(quickbooks_auth, name='dispatch')
class QBOBaseViewSet(viewsets.ViewSet):
    """
    Base ViewSet for QBO API
    """
    permission_classes = (IsAuthenticated,)
    qbo_client = None
    model_class = None

    def dispatch(self, request, *args, **kwargs):
        self.qbo_client = get_qbo_client(get_callback_url(request))
        return super().dispatch(request, *args, **kwargs)

    def retrieve(self, request, pk):
        if self.model_class is None:
            raise exceptions.APIException('model_class needs to be defined')
        try:
            obj = self.model_class.get(pk, qb=self.qbo_client)
        except ObjectNotFoundException:
            raise exceptions.NotFound
        return Response(obj.to_dict())


class CustomerQBOViewSet(QBOBaseViewSet):
    model_class = Customer

    def list(self, request):
        last_name = request.query_params.get('last_name')
        if last_name:
            objects = Customer.where("Active = True AND FamilyName LIKE '%{}%'".format(last_name), qb=self.qbo_client)
        else:
            objects = Customer.where("Active = True", qb=self.qbo_client)
        return Response([o.to_dict() for o in objects])


class EstimateQBOViewSet(QBOBaseViewSet):
    model_class = Estimate

    def create(self, request):
        # TODO
        estimate = Estimate()
        estimate.CustomerRef = request.query_params.get('customer_id')
        estimate.CustomField = [{
            "Type": "StringType",
            "Name": request.query_params.get('tagNumber'),
        }]
        estimate.save()
        #estimate.DocNumber = None
        #estimate.TxnDate = None
        #estimate.TxnStatus = None
        #estimate.PrivateNote = None
        #estimate.TotalAmt = 0
        #estimate.ExchangeRate = 1
        #estimate.ApplyTaxAfterDiscount = False
        #estimate.PrintStatus = "NotSet"
        #estimate.EmailStatus = "NotSet"
        #estimate.DueDate = None
        #estimate.ShipDate = None
        #estimate.ExpirationDate = None
        #estimate.AcceptedBy = None
        #estimate.AcceptedDate = None
        #estimate.GlobalTaxCalculation = "TaxExcluded"
        #estimate.BillAddr = None
        #estimate.ShipAddr = None
        #estimate.BillEmail = None
        #estimate.TxnTaxDetail = None
        #estimate.CustomerMemo = None
        #estimate.ClassRef = None
        #estimate.SalesTermRef = None
        #estimate.ShipMethodRef = None
        #estimate.LinkedTxn = []
        #estimate.Line = []
        return Response(estimate.to_dict())

    def list(self, request):
        customer_id = request.query_params.get('customer_id')
        if not customer_id:
            raise exceptions.APIException('customer_id is required')
        objects = Estimate.filter(CustomerRef=customer_id, qb=self.qbo_client)
        return Response([o.to_dict() for o in objects])


class InventoryQBOViewSet(QBOBaseViewSet):
    model_class = Item

    def list(self, request):
        name = request.query_params.get('name')
        if name:
            objects = Item.where("Type='Inventory' and Name LIKE '{}%'".format(name), qb=self.qbo_client)
        else:
            objects = Item.filter(Type='Inventory', qb=self.qbo_client)
        return Response([o.to_dict() for o in objects])


class ServiceQBOViewSet(QBOBaseViewSet):
    model_class = Item

    def list(self, request):
        objects = Item.filter(Type='Service', qb=self.qbo_client)
        return Response([o.to_dict() for o in objects])
