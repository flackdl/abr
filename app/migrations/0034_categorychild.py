# Generated by Django 2.2.7 on 2019-11-27 20:59

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0033_category_parent'),
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