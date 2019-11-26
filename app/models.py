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
    front_and_rear = models.BooleanField(default=False)

    class Meta:
        verbose_name_plural = 'categories'
        ordering = ('name',)

    def __str__(self):
        return self.name


class CategoryPrefix(models.Model):
    category = models.ForeignKey(Category, on_delete=models.CASCADE)
    prefix = models.CharField(max_length=255)
    front = models.BooleanField(default=False, help_text="Front of bike")
    rear = models.BooleanField(default=False, help_text="Rear of bike")

    class Meta:
        verbose_name_plural = 'category prefixes'
        unique_together = ('category', 'prefix',)

    def clean(self):
        if self.front and self.rear:
            raise ValidationError('Front and rear cannot both be chosen')

    def __str__(self):
        return '{}: {}'.format(self.category, self.prefix)


class CategoryAssessment(models.Model):
    CHOICE_TYPE_QUALITY = 'quality'
    CHOICE_TYPE_SERVICED = 'serviced'
    CHOICES = (
        CHOICE_TYPE_SERVICED, CHOICE_TYPE_QUALITY,
    )
    CHOICE_OPTIONS = (
        (CHOICE_TYPE_QUALITY, CHOICE_TYPE_QUALITY),
        (CHOICE_TYPE_SERVICED, CHOICE_TYPE_SERVICED),
    )

    name = models.CharField(max_length=255, unique=True)
    category = models.ForeignKey(Category, on_delete=models.CASCADE)
    type = models.CharField(choices=CHOICE_OPTIONS, max_length=255)
    required = models.BooleanField(default=True)

    class Meta:
        ordering = ('name',)

    def __str__(self):
        return '{}: {}'.format(self.category, self.type)
