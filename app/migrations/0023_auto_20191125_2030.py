# Generated by Django 2.2.7 on 2019-11-25 20:30

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0022_auto_20191125_2029'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='categoryassessment',
            options={'ordering': ('name',)},
        ),
    ]
