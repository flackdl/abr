from django.contrib.auth.models import User, Permission
from django.core.management import BaseCommand
from django.conf import settings
from app.models import Order, OrderPart


class Command(BaseCommand):
    help = 'Initialize app'

    def handle(self, *args, **options):
        # create user and set permissions
        users = User.objects.filter(username=settings.POS_USER)
        if users.exists():
            user = users[0]
        else:
            # create pos user (staff status)
            user = User.objects.create_user(settings.POS_USER, password=settings.POS_PASSWORD, is_staff=True)

        actions = ['add', 'change', 'delete']
        models = [Order, OrderPart]
        perms = []
        for model in models:
            for action in actions:
                perms += Permission.objects.filter(codename__in=[
                        '{}_{}'.format(action, model._meta.model_name)])
        user.user_permissions.set([p for p in perms])  # iterate because it doesn't expect a Queryset
