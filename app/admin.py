from django.contrib import admin
from app.models import Order, OrderPart, Category, CategoryPrefix, CategoryChild


class PartsInline(admin.TabularInline):
    model = OrderPart


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('date_created', 'arrived', 'order_id', 'vendor',)
    list_filter = ('date_created', 'arrived', 'order_id', 'vendor',)
    inlines = (PartsInline,)


@admin.register(OrderPart)
class OrderPartAdmin(admin.ModelAdmin):
    # note the distinction of "order arrived":
    # - the filter is a reverse query
    # - the display is a function lookup because it doesn't support the reverse lookup
    list_display = ('order', 'order_arrived', 'estimate_id', 'part_id',)
    list_filter = ('order', 'order__arrived', 'estimate_id', 'part_id',)

    def order_arrived(self, part):
        """
        :type part: OrderPart
        """
        return part.order.arrived


class CategoryChildInline(admin.TabularInline):
    model = CategoryChild
    extra = 0
    show_change_link = True


class CategoryPrefixInline(admin.TabularInline):
    model = CategoryPrefix
    extra = 0


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    inlines = (CategoryChildInline, CategoryPrefixInline,)
    list_display = ('name', 'position')

    def get_queryset(self, request):
        return super().get_queryset(request).filter(parent__isnull=True)


@admin.register(CategoryChild)
class CategoryChildrenAdmin(admin.ModelAdmin):
    inlines = (CategoryPrefixInline,)
    list_display = ('name', 'parent', 'position',)

    def get_queryset(self, request):
        return super().get_queryset(request).filter(parent__isnull=False)


@admin.register(CategoryPrefix)
class CategoryPrefixAdmin(admin.ModelAdmin):
    pass
