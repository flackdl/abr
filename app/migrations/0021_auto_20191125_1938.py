# Generated by Django 2.2.7 on 2019-11-25 19:38

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0020_categoryassessment_required'),
    ]

    operations = [
        migrations.AlterField(
            model_name='category',
            name='name',
            field=models.CharField(max_length=255, unique=True),
        ),
        migrations.AlterUniqueTogether(
            name='categoryassessment',
            unique_together={('category', 'name', 'type')},
        ),
        migrations.AlterUniqueTogether(
            name='categoryprefix',
            unique_together={('category', 'prefix')},
        ),
    ]