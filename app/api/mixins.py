class CustomerRefFilterMixin:

    def get_filters(self, request) -> dict:
        customer_id = request.query_params.get('customer_id')
        if customer_id:
            return {
                'CustomerRef': customer_id,
            }
        return {}
