# Generated by Django 2.2.7 on 2019-11-28 20:26

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0036_delete_categorychild'),
    ]

    operations = [
        migrations.CreateModel(
            name='CategoryChild',
            fields=[
            ],
            options={
                'verbose_name_plural': 'category children',
                'proxy': True,
                'indexes': [],
                'constraints': [],
            },
            bases=('app.category',),
        ),
    ]
