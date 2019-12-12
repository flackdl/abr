from io import StringIO
from datetime import datetime
from django.core import management
from django.core.management.commands import dumpdata
from django.core.management import BaseCommand
from django.conf import settings
import boto3


class Command(BaseCommand):
    help = 'Backup DB'

    def handle(self, *args, **options):
        s3_client = boto3.client('s3', aws_access_key_id=settings.AWS_ACCESS_KEY_ID, aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY)
        out = StringIO()
        management.call_command(dumpdata.Command(), 'app', stdout=out)
        s3_client.put_object(Body=out.getvalue(), Bucket='abr-backups', Key='db-{}.json'.format(datetime.now().day))
