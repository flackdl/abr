# Generated by Django 2.2.7 on 2019-11-26 18:31

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0023_auto_20191125_2030'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='category',
            name='back_only',
        ),
        migrations.RemoveField(
            model_name='category',
            name='front_only',
        ),
        migrations.AddField(
            model_name='category',
            name='front_and_back',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='categoryassessment',
            name='back',
            field=models.BooleanField(default=False, help_text='Back of bike'),
        ),
        migrations.AddField(
            model_name='categoryassessment',
            name='front',
            field=models.BooleanField(default=False, help_text='Front of bike'),
        ),
        migrations.AlterField(
            model_name='categoryassessment',
            name='required',
            field=models.BooleanField(default=False, help_text="only relevant for type 'serviced'"),
        ),
    ]