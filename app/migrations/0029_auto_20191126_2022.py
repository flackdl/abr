# Generated by Django 2.2.7 on 2019-11-26 20:22

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0028_auto_20191126_2019'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='categoryassessment',
            options={'ordering': ('position',)},
        ),
        migrations.AddField(
            model_name='categoryassessment',
            name='position',
            field=models.PositiveSmallIntegerField(null=True, verbose_name='Position'),
        ),
    ]