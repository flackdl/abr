# Generated by Django 2.2.7 on 2019-11-24 04:38

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0015_delete_serviceitem'),
    ]

    operations = [
        migrations.AddField(
            model_name='servicecategory',
            name='back_only',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='servicecategory',
            name='front_only',
            field=models.BooleanField(default=False),
        ),
    ]