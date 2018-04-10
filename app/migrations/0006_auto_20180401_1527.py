# -*- coding: utf-8 -*-
# Generated by Django 1.11.11 on 2018-04-01 15:27
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0005_auto_20180331_1559'),
    ]

    operations = [
        migrations.RenameField(
            model_name='order',
            old_name='date',
            new_name='date_created',
        ),
        migrations.AddField(
            model_name='order',
            name='date_arrived',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]