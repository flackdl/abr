from django.contrib import admin
from app.models import Order, OrderPart, Category, CategoryPrefix, CategoryAssessment


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


class CategoryPrefixInline(admin.TabularInline):
    model = CategoryPrefix


class CategoryAssessmentInline(admin.TabularInline):
    model = CategoryAssessment


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'front_and_rear')
    list_filter = ('front_and_rear',)
    inlines = (CategoryPrefixInline, CategoryAssessmentInline)


@admin.register(CategoryPrefix)
class CategoryPrefixAdmin(admin.ModelAdmin):
    pass


@admin.register(CategoryAssessment)
class CategoryAssessmentAdmin(admin.ModelAdmin):
    pass
