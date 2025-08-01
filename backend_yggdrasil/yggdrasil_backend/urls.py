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
from yggdrasilApp.views import BoxListView, EstadoBoxView, InfoBoxView, AgendaBox, DatosModificadosAPIView, \
                                VistaActualizableDispView, login_view, logout_view, user_info, AgendasNoMedicasView, upload_file, confirmar_guardado_agendas, \
                                BloquesNoMedicosDisponiblesView, CrearReservaNoMedicaView, MisReservasView, BoxesRecomendadosView, DashboardStatsView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/boxes/', BoxListView.as_view(), name='box-list'),
    path('api/boxes/<int:id>/', BoxListView.as_view(), name='box-detail'),
    path('api/estado_box/', EstadoBoxView.as_view(), name='estado_box'),
    path('api/info_box/', InfoBoxView.as_view(), name='info_box'),
    path('api/box/<int:id>/', AgendaBox.as_view(), name='agenda_box'),
    path('api/modificados-desde/<str:fecha_hora_str>/', DatosModificadosAPIView.as_view(), name='datos_modificados'),
    path('api/verificar_actualizacion/', VistaActualizableDispView.as_view(), name='vista_flag'),
    path('api/agendas-no-medicas/<int:id>/', AgendasNoMedicasView.as_view()),
    path('api/bloques-no-medicos/<int:id>/', BloquesNoMedicosDisponiblesView.as_view()),
    path('api/reservar-no-medica/', CrearReservaNoMedicaView.as_view()),
    path('api/boxes-recomendados/', BoxesRecomendadosView.as_view(), name='boxes_recomendados'),
    path('api/mis-reservas/', MisReservasView.as_view(), name='mis_reservas'),
    path('api/dashboard-stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('api/login/', login_view, name='login_view'),
    path('api/logout/',logout_view, name='logout_view'),
    path('api/user/', user_info, name='user_info'),
    path('api/upload/', upload_file),
    path('api/confirmar-agendas/', confirmar_guardado_agendas, name='confirmar-agendas'),
]
