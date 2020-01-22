from rest_framework import serializers
from app.models import Order, OrderPart, Category, CategoryPrefix

CRMS = (
    ('1', 'Current customer walk-in'),
    ('2', 'New customer from referral'),
    ('3', 'New customer from internet'),
    ('4', 'New customer from yelp'),
    ('5', 'New customer off the street'),
    ('6', 'New customer from performance'),
    ('7', 'Craigslist/offer up'),
    ('8', 'SOCIAL MEDIA'),
)


class OrderPartSerializer(serializers.ModelSerializer):

    class Meta:
        model = OrderPart
        fields = '__all__'


class OrderSerializer(serializers.ModelSerializer):
    parts = OrderPartSerializer(many=True, source='orderpart_set', required=False)

    class Meta:
        model = Order
        fields = '__all__'


class EstimateCreateQBOSerializer(serializers.Serializer):
    STATUSES = ['Pending', 'Accepted', 'Closed', 'Rejected']

    customer_id = serializers.IntegerField()
    status = serializers.ChoiceField(choices=STATUSES)
    email = serializers.CharField()  # used for billing email for invoice
    tag_number = serializers.CharField()
    bike_model = serializers.CharField()
    expiration_date = serializers.DateField()
    expiration_time = serializers.TimeField()
    category_items = serializers.JSONField()  # individual items validated against EstimateLineQBOSerializer
    public_notes = serializers.CharField()
    private_notes = serializers.CharField()
    signature = serializers.CharField()  # data uri
    discount_percent = serializers.FloatField(default=0, allow_null=True)  # i.e "10.5" for "10.5%"
    discount_applied_to_all = serializers.BooleanField(default=False, allow_null=True)


class EstimateLineQBOSerializer(serializers.Serializer):
    LINE_TYPE_SERVICE = 'service'
    LINE_TYPE_INVENTORY = 'inventory'
    id = serializers.IntegerField()
    name = serializers.CharField()
    type = serializers.ChoiceField(choices=(LINE_TYPE_INVENTORY, LINE_TYPE_SERVICE))
    quantity = serializers.IntegerField()
    price = serializers.FloatField()
    amount = serializers.FloatField()
    description = serializers.CharField(allow_blank=True)


class EstimateLineCategoryItemsQBOSerializer(serializers.Serializer):
    name = serializers.CharField()  # category name
    items = EstimateLineQBOSerializer(many=True)


class CustomerCreateQBOSerializer(serializers.Serializer):
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    email = serializers.CharField()
    phone = serializers.IntegerField()
    address_line1 = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    address_line2 = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    city = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    zip = serializers.CharField()
    crm = serializers.ChoiceField(choices=[crm[0] for crm in CRMS])


class CategorySerializer(serializers.ModelSerializer):

    class Meta:
        model = Category
        fields = '__all__'


class CategoryPrefixSerializer(serializers.ModelSerializer):

    class Meta:
        model = CategoryPrefix
        fields = '__all__'
