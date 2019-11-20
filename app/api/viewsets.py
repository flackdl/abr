import logging
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from quickbooks.exceptions import ObjectNotFoundException
from quickbooks.objects import Customer, Estimate, Item, Preferences, Invoice, EmailAddress, PhoneNumber
from rest_framework import viewsets, status, exceptions
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from app.api.mixins import CustomerRefFilterMixin
from app.models import Order, OrderPart
from app.api.serializers import OrderSerializer, OrderPartSerializer, EstimateCreateQBOSerializer, CustomerCreateQBOSerializer
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

    def list(self, request):
        filters = self.get_filters(request)
        objects = self.model_class.filter(**filters, qb=self.qbo_client)
        return Response([o.to_dict() for o in objects])

    def retrieve(self, request, pk):
        if self.model_class is None:
            raise exceptions.APIException('model_class needs to be defined')
        try:
            obj = self.model_class.get(pk, qb=self.qbo_client)
        except ObjectNotFoundException:
            raise exceptions.NotFound
        return Response(obj.to_dict())

    def get_filters(self, request) -> dict:
        return dict()


class CustomerQBOViewSet(QBOBaseViewSet):
    model_class = Customer

    def create(self, request):

        # validate
        serializer_customer = CustomerCreateQBOSerializer(data=request.data)
        serializer_customer.is_valid(raise_exception=True)
        data = serializer_customer.validated_data

        #
        # save
        #

        email = EmailAddress()
        email.Address = data['email']
        phone = PhoneNumber()
        phone.FreeFormNumber = data['phone']

        customer = Customer()
        customer.PrimaryEmailAddr = email
        customer.PrimaryPhone = phone
        customer.GivenName = data['first_name']
        customer.FamilyName = data['last_name']
        customer.save(qb=self.qbo_client)

        return Response(customer.to_dict())

    def list(self, request):
        last_name = request.query_params.get('last_name')
        if last_name:
            objects = Customer.where("Active = True AND FamilyName LIKE '%{}%'".format(last_name), qb=self.qbo_client)
        else:
            objects = Customer.where("Active = True", qb=self.qbo_client)
        return Response([o.to_dict() for o in objects])


class EstimateQBOViewSet(CustomerRefFilterMixin, QBOBaseViewSet):
    model_class = Estimate

    def create(self, request):

        # validate
        estimate_create_serializer = EstimateCreateQBOSerializer(data=request.data)
        estimate_create_serializer.is_valid(raise_exception=True)
        data = estimate_create_serializer.validated_data

        estimate = Estimate()
        estimate.TxnStatus = data['status']
        estimate.TxnDate = data['estimate_date'].isoformat()
        estimate.CustomerRef = {
            "value": data['customer_id'],
        }
        estimate.Line = [
            {
                "DetailType": "SalesItemLineDetail",
                "SalesItemLineDetail": {
                    "Qty": 1,
                    "ItemRef": {
                        "name": "Rock Fountain",
                        "value": "5",
                    },
                },
                "Amount": 10.0,
            },
        ]

        estimate.CustomField = [{
            "DefinitionId": "2",
            "Type": "StringType",
            "Name": "Tag #",
            "StringValue": data['tag_number'],
        }]

        # TODO
        #estimate.ExpirationDate = None
        #estimate.TxnDate = None
        #estimate.DueDate = None
        #estimate.TxnStatus = None

        estimate.save(qb=self.qbo_client)

        return Response(estimate.to_dict())


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


class InvoiceQBOViewSet(CustomerRefFilterMixin, QBOBaseViewSet):
    model_class = Invoice


@method_decorator(cache_page(timeout=3600), name='dispatch')
class PreferencesQBOViewSet(QBOBaseViewSet):
    model_class = Preferences
