# Funciones utilitarias compartidas entre views

from datetime import datetime
from rest_framework.exceptions import ValidationError


def parse_date_param(date_str, param_name):
    """
    Parsea un parámetro de fecha desde string a date object
    """
    try:
        return datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        raise ValidationError(f"El parámetro '{param_name}' debe estar en formato YYYY-MM-DD")


def get_client_ip(request):
    """Obtener IP del cliente"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip
