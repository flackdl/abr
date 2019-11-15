from quickbooks.objects import Customer
from rest_framework import views
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from app.utils import get_qbo_client, get_callback_url, get_redis_client


class CustomersView(views.APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        redis_client = get_redis_client()
        redis_client.get('access_token')
        qbo_client = get_qbo_client(get_callback_url(request))
        customers = [c.to_json() for c in Customer.all(qb=qbo_client)]
        return Response({'customers': customers})
