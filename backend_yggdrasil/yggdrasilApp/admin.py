from django.contrib import admin
from django.contrib.auth.models import User, Group
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html

#para visualizar los roles en el listado
def get_roles(user):
    return ", ".join([group.name for group in user.groups.all()])

get_roles.short_description = 'Roles asignados'

class CustomUserAdmin(BaseUserAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name', get_roles, 'is_staff', 'is_active')
    list_filter = ('is_staff', 'is_active', 'groups')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    ordering = ('username',)
    filter_horizontal = ('groups', 'user_permissions',)

admin.site.unregister(User)
admin.site.register(User, CustomUserAdmin)

