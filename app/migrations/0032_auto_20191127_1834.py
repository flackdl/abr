# Generated by Django 2.2.7 on 2019-11-27 18:34

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0031_auto_20191127_1807'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='category',
            options={'ordering': ('position',), 'verbose_name_plural': 'categories'},
        ),
        migrations.AddField(
            model_name='category',
            name='position',
            field=models.PositiveSmallIntegerField(default=1),
            preserve_default=False,
        ),
    ]