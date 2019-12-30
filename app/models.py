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


class CategoryParentManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(parent__isnull=True)


class CategoryChildManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(parent__isnull=False)


class Category(models.Model):
    name = models.CharField(max_length=255)
    position = models.PositiveSmallIntegerField()
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True)
    service_only = models.BooleanField(default=False)

    # managers - the first one declared is the default
    objects = models.Manager()
    parents = CategoryParentManager()
    children = CategoryChildManager()

    class Meta:
        verbose_name_plural = 'categories'
        ordering = ('position',)

    def clean(self):
        # prevent top-level category duplication
        exclude_kwargs = {}
        if self.id:
            exclude_kwargs['id'] = self.id
        existing_category = Category.parents.filter(name=self.name).exclude(**exclude_kwargs).first()
        if not self.parent and existing_category:
            raise ValidationError('Top Level Categories cannot be duplicated')
        super().clean()

    def __str__(self):
        return self.name


class CategoryChild(Category):
    """
    Proxy model defining "child" categories
    """
    objects = CategoryChildManager()

    class Meta:
        verbose_name_plural = 'category children'
        proxy = True


class CategoryPrefix(models.Model):
    category = models.ForeignKey(Category, on_delete=models.CASCADE)
    prefix = models.CharField(max_length=255)
    type = models.CharField(max_length=20, choices=(('inventory', 'Inventory'), ('service', 'Service')))

    class Meta:
        verbose_name_plural = 'category prefixes'
        unique_together = ('category', 'prefix',)

    def __str__(self):
        return '{}: {}'.format(self.category, self.prefix)
