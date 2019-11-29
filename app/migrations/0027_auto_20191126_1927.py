# Generated by Django 2.2.7 on 2019-11-26 19:27

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0026_auto_20191126_1925'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='categoryassessment',
            name='front',
        ),
        migrations.RemoveField(
            model_name='categoryassessment',
            name='rear',
        ),
        migrations.AlterField(
            model_name='categoryassessment',
            name='required',
            field=models.BooleanField(default=True, help_text="only relevant for type 'serviced'"),
        ),
    ]