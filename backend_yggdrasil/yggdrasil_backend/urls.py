"""
URL configuration for yggdrasil_backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path
from yggdrasilApp.views import BoxListView, EstadoBoxView, InfoBoxView, AgendaBox, DatosModificadosAPIView, VistaActualizableDispView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/boxes/', BoxListView.as_view(), name='box-list'),
    path('api/boxes/<int:id>/', BoxListView.as_view(), name='box-detail'),
    path('api/estado_box/', EstadoBoxView.as_view(), name='estado_box'),
    path('api/info_box/', InfoBoxView.as_view(), name='info_box'),
    path('api/box/<int:id>/', AgendaBox.as_view(), name='agenda_box'),
    path('api/modificados-desde/<str:fecha_hora_str>/', DatosModificadosAPIView.as_view(), name='datos_modificados'),
    path('api/verificar_actualizacion/', VistaActualizableDispView.as_view(), name='vista_flag'),
]
