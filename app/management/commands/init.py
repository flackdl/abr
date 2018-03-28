from django.contrib.auth.models import User
from django.core.management import BaseCommand
from django.conf import settings


class Command(BaseCommand):
    help = 'Init'

    def handle(self, *args, **options):
        # create pos user
        User.objects.create_user(settings.POS_USER, password=settings.POS_PASSWORD)
