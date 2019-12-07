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
    tag_number = serializers.CharField()
    bike_model = serializers.CharField()
    expiration_date = serializers.DateField()
    expiration_time = serializers.TimeField()
    items = serializers.JSONField()  # validated against EstimateLineCreateQBOSerializer
    public_notes = serializers.CharField()
    private_notes = serializers.CharField()


class EstimateLineCreateQBOSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    quantity = serializers.IntegerField()
    amount = serializers.FloatField()


class CustomerCreateQBOSerializer(serializers.Serializer):
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    email = serializers.CharField()
    phone = serializers.IntegerField()
    address_line1 = serializers.CharField(required=False, allow_blank=True)
    address_line2 = serializers.CharField(required=False, allow_blank=True)
    city = serializers.CharField(required=False, allow_blank=True)
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
