# Views relacionadas con autenticación

import json
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods


@csrf_exempt
@require_http_methods(["POST"])
def login_view(request):
    data = json.loads(request.body)
    username = data.get('username')
    password = data.get('password')

    user = authenticate(request, username=username, password=password)
    if user is not None and user.is_active:
        login(request, user)
        roles = list(user.groups.values_list('name', flat=True))
        return JsonResponse({
            'message': 'Login exitoso',
            'username': user.username,
            'roles': roles
        })
    else:
        return JsonResponse({'error': 'Credenciales inválidas'}, status=401)


@csrf_exempt
@require_http_methods(["POST"])
def logout_view(request):
    logout(request)
    return JsonResponse({'message': 'Sesión cerrada correctamente'})


@login_required
def user_info(request):
    roles = list(request.user.groups.values_list('name', flat=True))
    return JsonResponse({
        'username': request.user.username,
        'roles': roles
    })
