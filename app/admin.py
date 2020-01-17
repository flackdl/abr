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
    list_display = ('name', 'position', 'show_in_assessment', 'prefixes',)
    list_filter = ('show_in_assessment',)
    exclude = ('parent',)

    def get_queryset(self, request):
        return Category.parents.all()

    def prefixes(self, obj: Category):
        # parent category prefixes
        prefixes = [p for p in obj.categoryprefix_set.all()]
        # child category prefixes
        prefixes += [p for c in Category.children.filter(parent=obj) for p in c.categoryprefix_set.all()]
        # group by type
        inventory = [p.prefix for p in prefixes if p.type == 'inventory']
        service = [p.prefix for p in prefixes if p.type == 'service']
        return 'Inventory: {}, Service: {}'.format('|'.join(inventory), '|'.join(service))


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
    exclude = ('show_in_assessment',)

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        # only include parent categories for the parent dropdown
        if db_field.name == 'parent':
            kwargs["queryset"] = Category.parents.all()
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

    def get_queryset(self, request):
        return Category.children.all()


@admin.register(CategoryPrefix)
class CategoryPrefixAdmin(admin.ModelAdmin):
    pass
