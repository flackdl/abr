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
    name = models.CharField(max_length=255, unique=True)
    position = models.PositiveSmallIntegerField()
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True)

    class Meta:
        verbose_name_plural = 'categories'
        ordering = ('position',)

    def __str__(self):
        return self.name


class CategoryChild(Category):
    """
    Necessary to register the Category model again in the admin for children categories
    """
    class Meta:
        verbose_name_plural = 'category children'
        proxy = True


class CategoryPrefix(models.Model):
    category = models.ForeignKey(Category, on_delete=models.CASCADE)
    prefix = models.CharField(max_length=255)

    class Meta:
        verbose_name_plural = 'category prefixes'
        unique_together = ('category', 'prefix',)

    def __str__(self):
        return '{}: {}'.format(self.category, self.prefix)
