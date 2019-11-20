from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from rest_framework import views
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from app.api.serializers import EstimateCreateQBOSerializer, CRMS


@method_decorator(cache_page(timeout=3600), name='dispatch')
class SettingsView(views.APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request, *args):
        return Response({
            'crms': CRMS,
            'statuses': EstimateCreateQBOSerializer.STATUSES,
        })
