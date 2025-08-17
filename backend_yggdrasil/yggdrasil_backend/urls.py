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

from django.http import HttpResponse
from django.contrib import admin
from django.urls import path
from yggdrasilApp.views import BoxListView, EstadoBoxView, InfoBoxView, AgendaBox, DatosModificadosAPIView, \
                                VistaActualizableDispView, login_view, logout_view, user_info, AgendasNoMedicasView, upload_file, confirmar_guardado_agendas, \
                                BloquesNoMedicosDisponiblesView, CrearReservaNoMedicaView, BoxesRecomendadosView, DashboardStatsView, \
                                CrearReservaMedicaView, MisReservasMedicasView, MisReservasNoMedicasView, LiberarReservaView, AgendasPorMedicoView, \
                                AgendasPorPasilloView, SugerenciasMedicoView, UpdateReservaView, CheckDisponibilidadView, BloquesLibresView , \
                                ResolverTopeView, AplicarSolucionView, BoxesInhabilitadosView, AgendasConTopeView, TodasAgendasView\


def home(request):
    return HttpResponse("API de Yggdrasil funcionando")

urlpatterns = [
    path('', home),
    path('admin/', admin.site.urls),
    path('api/boxes/', BoxListView.as_view(), name='box-list'),
    path('api/boxes/<int:id>/', BoxListView.as_view(), name='box-detail'),
    path('api/estado_box/', EstadoBoxView.as_view(), name='estado_box'),
    path('api/info_box/', InfoBoxView.as_view(), name='info_box'),
    path('api/box/<int:id>/', AgendaBox.as_view(), name='agenda_box'),
    path('api/pasillo/', AgendasPorPasilloView.as_view(), name='agendas-por-pasillo'),
    path('api/medico/', AgendasPorMedicoView.as_view(), name='agendas-por-medico'),
    path('api/medico/sugerencias/', SugerenciasMedicoView.as_view(), name='sugerencias-medico'),
    path('api/modificados-desde/<str:fecha_hora_str>/', DatosModificadosAPIView.as_view(), name='datos_modificados'),
    path('api/verificar_actualizacion/', VistaActualizableDispView.as_view(), name='vista_flag'),
    path('api/agendas-no-medicas/<int:id>/', AgendasNoMedicasView.as_view()),
    path('api/bloques-no-medicos/<int:id>/', BloquesNoMedicosDisponiblesView.as_view()),
    path('api/reservar-no-medica/', CrearReservaNoMedicaView.as_view()),
    path('api/reservar-medica/', CrearReservaMedicaView.as_view(), name='reservar-medica'),
    path('api/<int:box_id>/bloques-libres/', BloquesLibresView.as_view(), name='bloques-libres'),
    path('api/boxes-recomendados/', BoxesRecomendadosView.as_view(), name='boxes_recomendados'),
    path('api/mis-reservas-medicas/', MisReservasMedicasView.as_view(), name='mis-reservas-medicas'),
    path('api/mis-reservas-no-medicas/', MisReservasNoMedicasView.as_view(), name='mis-reservas-no-medicas'),
    path('api/reservas/<int:reserva_id>/liberar/', LiberarReservaView.as_view(), name='liberar-reserva'),
    path('api/reservas/<int:reserva_id>/modificar/', UpdateReservaView.as_view(), name='modificar-reserva'),
    path('api/dashboard-stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('api/check_disponibilidad/', CheckDisponibilidadView.as_view(), name='check-disponibilidad'),
    path("api/resolver-tope/", ResolverTopeView.as_view(), name="resolver-topes"),
    path("api/aplicar-solucion/", AplicarSolucionView.as_view(), name="aplicar-solucion"),
    path('api/boxes-inhabilitados/', BoxesInhabilitadosView.as_view(), name='boxes-inhabilitados'), 
    path('api/agendas-con-tope/', AgendasConTopeView.as_view(), name='agendas-con-tope'),
    path('api/todas-las-agendas/', TodasAgendasView.as_view(), name='todas-las-agendas'),
    path('api/login/', login_view, name='login_view'),
    path('api/logout/',logout_view, name='logout_view'),
    path('api/user/', user_info, name='user_info'),
    path('api/upload/', upload_file),
    path('api/confirmar-agendas/', confirmar_guardado_agendas, name='confirmar-agendas'),
]
