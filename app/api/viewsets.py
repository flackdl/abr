import tempfile
from base64 import b64decode
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from quickbooks.exceptions import ObjectNotFoundException, ValidationException
from quickbooks.objects import Customer, Estimate, Item, Preferences, Invoice, EmailAddress, PhoneNumber, Address, Attachable, AttachableRef
from rest_framework import viewsets, status, exceptions
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from app.api.mixins import CustomerRefFilterMixin
from app.models import Order, OrderPart, Category, CategoryPrefix, CategoryChild
from app.api.serializers import (
    OrderSerializer, OrderPartSerializer, EstimateCreateQBOSerializer, CustomerCreateQBOSerializer, CategorySerializer,
    CategoryPrefixSerializer, EstimateLineCreateQBOSerializer)
from app.utils import get_qbo_client, get_callback_url, quickbooks_auth, get_custom_field_index_from_preferences

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

    def update(self, request, pk):
        # validate
        serializer_customer = CustomerCreateQBOSerializer(data=request.data)
        serializer_customer.is_valid(raise_exception=True)

        # query existing customer to get sync token
        customer = Customer.get(pk, qb=self.qbo_client)
        # populate new instance with updated data and perform a "sparse" update
        updated_customer = Customer()
        updated_customer.Id = pk
        updated_customer.SyncToken = customer.SyncToken
        updated_customer.sparse = True
        data = serializer_customer.validated_data

        self._populate_customer(updated_customer, data)

        # save
        try:
            updated_customer.save(qb=self.qbo_client)
        except ValidationException as e:
            return Response({"success": False, "message": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(updated_customer.to_dict())

    def create(self, request):

        # validate
        serializer_customer = CustomerCreateQBOSerializer(data=request.data)
        serializer_customer.is_valid(raise_exception=True)
        data = serializer_customer.validated_data

        #
        # save
        #

        customer = Customer()
        self._populate_customer(customer, data)

        try:
            customer.save(qb=self.qbo_client)
        except ValidationException as e:
            return Response({"success": False, "message": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(customer.to_dict())

    def list(self, request):
        last_name = request.query_params.get('last_name')
        if last_name:
            objects = Customer.where("Active = True AND DisplayName LIKE '%{}%'".format(last_name), qb=self.qbo_client)
        else:
            objects = Customer.where("Active = True", qb=self.qbo_client)
        return Response([o.to_dict() for o in objects])

    def _populate_customer(self, customer: Customer, data: dict):

        email = EmailAddress()
        email.Address = data['email']
        phone = PhoneNumber()
        phone.FreeFormNumber = data['phone']
        address = Address()
        address.Line1 = data.get('address_line1')
        address.Line2 = data.get('address_line2')
        address.City = data.get('city')
        address.PostalCode = data['zip']

        customer.PrimaryEmailAddr = email
        customer.PrimaryPhone = phone
        customer.BillAddr = address
        customer.ShipAddr = address
        customer.GivenName = data['first_name']
        customer.FamilyName = data['last_name']

        # hijacking this field which has a max character limit so we're storing the id associated to the CRM
        customer.ResaleNum = data['crm']


class EstimateQBOViewSet(CustomerRefFilterMixin, QBOBaseViewSet):
    model_class = Estimate

    def create(self, request):
        # TODO - signature/attachment

        # validate estimate data
        estimate_serializer = EstimateCreateQBOSerializer(data=request.data)
        estimate_serializer.is_valid(raise_exception=True)
        estimate_data = estimate_serializer.validated_data

        # validate estimate lines data
        estimate_line_serializer = EstimateLineCreateQBOSerializer(data=estimate_data['items'], many=True)
        estimate_line_serializer.is_valid(raise_exception=True)
        lines = estimate_line_serializer.validated_data

        #
        # create estimate
        #

        estimate = Estimate()
        estimate.TxnStatus = estimate_data['status']
        estimate.CustomerRef = {
            "value": estimate_data['customer_id'],
        }
        estimate.PrivateNote = estimate_data['private_notes']
        estimate.CustomerMemo = {
            "value": estimate_data['public_notes'],
        }
        estimate.ExpirationDate = estimate_data['expiration_date'].isoformat()

        # build lines
        for line in lines:
            estimate.Line.append({
                "DetailType": "SalesItemLineDetail",
                "SalesItemLineDetail": {
                    "Qty": line['quantity'],
                    "ItemRef": {
                        "name": line['name'],
                        "value": line['id']
                    },
                },
                "Amount": line['amount'],
            })

        # query preferences so we can get the custom field ids
        preferences = Preferences.filter(qb=self.qbo_client)[0].to_dict()

        # custom field Tag #
        estimate.CustomField.append(
            {
                "DefinitionId": get_custom_field_index_from_preferences('Tag #', preferences),
                "Type": "StringType",
                "Name": "Tag #",
                "StringValue": estimate_data['tag_number'],
            }
        )
        # custom field Expiration Time
        estimate.CustomField.append(
            {
                "DefinitionId": get_custom_field_index_from_preferences('Expiration Time', preferences),
                "Type": "StringType",
                "Name": "Expiration Time",
                "StringValue": estimate_data['expiration_time'].isoformat(),
            }
        )

        estimate.save(qb=self.qbo_client)

        # save signature (data uri) to temporary file so we can upload and attach it to the estimate
        with tempfile.NamedTemporaryFile(delete=False) as fh:

            # save to image
            header, encoded = estimate_data['signature'].split(",", 1)
            data = b64decode(encoded)
            fh.write(data)

            # create attachment
            attachment = Attachable()
            attachable_ref = AttachableRef()
            attachable_ref.IncludeOnSend = True
            attachable_ref.EntityRef = {
                "type": 'Estimate',
                "value": estimate.Id,
            }
            attachment.AttachableRef.append(attachable_ref)
            attachment.FileName = 'signature.png'
            attachment._FilePath = fh.name
            attachment.ContentType = 'image/png'
            attachment.save(qb=self.qbo_client)

        return Response(estimate.to_dict())


class ItemBaseQBOViewSet(QBOBaseViewSet):
    model_class = Item
    item_type = None

    def list(self, request):
        wheres = []

        name = request.query_params.get('name')
        if name:
            wheres.append("Name LIKE '{}%'".format(name))

        if wheres:
            # always include the item type
            wheres.append("Type='{}'".format(self.item_type))
            objects = Item.where(" and ".join(wheres), qb=self.qbo_client)
        else:
            objects = Item.filter(Type=self.item_type, qb=self.qbo_client)
        return Response([o.to_dict() for o in objects])


class InventoryQBOViewSet(ItemBaseQBOViewSet):
    item_type = 'Inventory'


class ServiceQBOViewSet(ItemBaseQBOViewSet):
    item_type = 'Service'


class InvoiceQBOViewSet(CustomerRefFilterMixin, QBOBaseViewSet):
    model_class = Invoice


@method_decorator(cache_page(timeout=3600), name='dispatch')
class PreferencesQBOViewSet(QBOBaseViewSet):
    model_class = Preferences

    def list(self, request):
        # qbo preferences returns a list but there's only one object
        return Response(Preferences.filter(qb=self.qbo_client)[0].to_dict())


class CategoryParentViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer

    def get_queryset(self):
        # only return parents here
        return Category.parents.all()


class CategoryChildViewSet(viewsets.ModelViewSet):
    queryset = CategoryChild.objects.all()
    serializer_class = CategorySerializer


class CategoryPrefixViewSet(viewsets.ModelViewSet):
    queryset = CategoryPrefix.objects.all()
    serializer_class = CategoryPrefixSerializer
