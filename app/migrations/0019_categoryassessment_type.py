# Generated by Django 2.2.7 on 2019-11-25 19:22

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0018_categoryassessment'),
    ]

    operations = [
        migrations.AddField(
            model_name='categoryassessment',
            name='type',
            field=models.CharField(choices=[('quality', 'quality'), ('serviced', 'serviced')], default='quality', max_length=255),
            preserve_default=False,
        ),
    ]