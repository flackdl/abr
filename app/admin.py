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
    readonly_fields = ('prefixes',)

    def prefixes(self, obj: CategoryChild):
        return ', '.join([p.prefix for p in obj.categoryprefix_set.all()])


class CategoryPrefixInline(admin.TabularInline):
    model = CategoryPrefix
    extra = 0


@admin.register(Category)
class CategoryParentAdmin(admin.ModelAdmin):
    inlines = (CategoryChildInline, CategoryPrefixInline,)
    list_display = ('name', 'position', 'service_only', 'prefixes',)
    exclude = ('parent',)

    def get_queryset(self, request):
        return Category.parents.all()

    def prefixes(self, obj: Category):
        # parent category prefixes
        prefixes = [p.prefix for p in obj.categoryprefix_set.all()]
        # child category prefixes
        prefixes += [p.prefix for c in Category.children.filter(parent=obj) for p in c.categoryprefix_set.all()]
        return prefixes


@admin.register(CategoryChild)
class CategoryChildAdmin(CategoryParentAdmin):
    """
    Inherit from CategoryParentAdmin and:
    - only include child categories
    - only include prefix admin inline
    - include all fields
    """
    list_display = ('name', 'parent', 'prefixes',)
    inlines = (CategoryPrefixInline,)
    exclude = ()

    def get_queryset(self, request):
        return Category.children.all()


@admin.register(CategoryPrefix)
class CategoryPrefixAdmin(admin.ModelAdmin):
    pass
