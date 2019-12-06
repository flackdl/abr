from django.contrib.auth.models import User, Permission
from django.core.management import BaseCommand
from django.conf import settings
from app.models import Order, OrderPart


class Command(BaseCommand):
    help = 'Initialize app'

    def handle(self, *args, **options):

        # create manager user with staff & superuser status
        users = User.objects.filter(username=settings.MANAGER_USER)
        if not users:
            # create manager user
            User.objects.create_user(settings.MANAGER_USER, password=settings.MANAGER_PASSWORD, is_staff=True, is_superuser=True)

        # create "pos" user
        users = User.objects.filter(username=settings.POS_USER)
        if users.exists():
            user = users[0]
        else:
            # create pos user
            user = User.objects.create_user(settings.POS_USER, password=settings.POS_PASSWORD)

        # set permissions on pos user
        actions = ['add', 'change', 'delete']
        models = [Order, OrderPart]
        perms = []
        for model in models:
            for action in actions:
                perms += Permission.objects.filter(codename__in=[
                        '{}_{}'.format(action, model._meta.model_name)])
        user.user_permissions.set(list(perms))
