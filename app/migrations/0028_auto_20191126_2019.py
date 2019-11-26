# Generated by Django 2.2.7 on 2019-11-26 20:19

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0027_auto_20191126_1927'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='category',
            options={'ordering': ('position',), 'verbose_name_plural': 'categories'},
        ),
        migrations.AddField(
            model_name='category',
            name='position',
            field=models.PositiveSmallIntegerField(null=True, verbose_name='Position'),
        ),
        migrations.AlterField(
            model_name='categoryassessment',
            name='required',
            field=models.BooleanField(default=True),
        ),
    ]
