from django.contrib import admin
from app.models import Order, OrderEstimatePart


@admin.register(Order, OrderEstimatePart)
class Admin(admin.ModelAdmin):
    pass
