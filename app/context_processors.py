from django.conf import settings


def processor(request):
    """
    Add media-related context variables to the context.
    """
    return {
        'polling_rate_seconds': settings.ESTIMATE_QUERY_SECONDS,
    }