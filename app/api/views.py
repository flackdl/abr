from rest_framework import views
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from app.api.serializers import QBOEstimateCreateSerializer


class SettingsView(views.APIView):
    permission_classes = (IsAuthenticated,)
    def get(self, request, *args):
        return Response({
            'crms': QBOEstimateCreateSerializer.CRMS,
            'statuses': QBOEstimateCreateSerializer.STATUSES,
        })
