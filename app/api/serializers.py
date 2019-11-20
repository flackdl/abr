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


class EstimateCreateQBOSerializer(serializers.Serializer):
    STATUSES = ['Pending', 'Accepted', 'Closed', 'Rejected']
    CRMS = [
        'Current customer walk-in',
        'New customer from referral',
        'New customer from internet',
        'New customer from yelp',
        'New customer off the street',
        'New customer from performance',
        'Craigslist/offer up',
        'SOCIAL MEDIA',
    ]

    customer_id = serializers.IntegerField()
    status = serializers.ChoiceField(choices=STATUSES)
    tag_number = serializers.CharField()
    bike_model = serializers.CharField()
    crm = serializers.ChoiceField(choices=CRMS)
    estimate_date = serializers.DateField()
    expiration_date = serializers.DateField()
    expiration_time = serializers.TimeField()


class CustomerCreateQBOSerializer(serializers.Serializer):
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    email = serializers.CharField()
    phone = serializers.IntegerField()
