from django.core.exceptions import ValidationError
from django.db import models


class Order(models.Model):
    date_created = models.DateTimeField(auto_now_add=True)
    arrived = models.BooleanField(default=False)
    order_id = models.CharField(max_length=255)
    vendor = models.CharField(max_length=255)
    description = models.TextField(blank=True)

    class Meta:
        unique_together = ('order_id', 'vendor',)

    def __str__(self):
        return '{}: {}'.format(self.vendor, self.order_id)


class OrderPart(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE)
    estimate_id = models.IntegerField()
    part_id = models.IntegerField()
    part_description = models.TextField(blank=True)
    quantity = models.IntegerField()

    def __str__(self):
        return '{} => {}'.format(self.order, self.part_id)


class Category(models.Model):
    name = models.CharField(max_length=255)
    front_only = models.BooleanField(default=False)
    back_only = models.BooleanField(default=False)

    def clean(self):
        if self.front_only and self.back_only:
            raise ValidationError('Front and back cannot both be chosen')

    def __str__(self):
        return self.name


class CategoryPrefix(models.Model):
    category = models.ForeignKey(Category, on_delete=models.CASCADE)
    prefix = models.CharField(max_length=255)

    def __str__(self):
        return '{}: {}'.format(self.category, self.prefix)
