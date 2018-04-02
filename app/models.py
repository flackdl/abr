from django.db import models


class Order(models.Model):
    date_created = models.DateTimeField(auto_now_add=True)
    arrived = models.BooleanField(default=False)
    order_id = models.CharField(max_length=255)
    vendor = models.CharField(max_length=255)
    description = models.TextField(blank=True)


class OrderPart(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE)
    estimate_id = models.IntegerField()
    part_id = models.IntegerField()
    quantity = models.IntegerField()
