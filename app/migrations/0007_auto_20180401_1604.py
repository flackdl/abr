# -*- coding: utf-8 -*-
# Generated by Django 1.11.11 on 2018-04-01 16:04
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0006_auto_20180401_1527'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='order',
            name='date_arrived',
        ),
        migrations.AddField(
            model_name='order',
            name='arrived',
            field=models.BooleanField(default=False),
        ),
    ]