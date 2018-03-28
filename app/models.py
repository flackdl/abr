from django.db import models


class Order(models.Model):
    date = models.DateTimeField(auto_now_add=True)
    order_id = models.CharField(max_length=255)
    vendor = models.CharField(max_length=255)
    description = models.TextField(blank=True)


class OrderPart(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE)
    part_id = models.IntegerField()
    part_sku = models.CharField(max_length=255)
    quantity = models.IntegerField()
