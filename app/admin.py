from django.contrib import admin
from app.models import Order, OrderPart


@admin.register(Order, OrderPart)
class Admin(admin.ModelAdmin):
    pass
