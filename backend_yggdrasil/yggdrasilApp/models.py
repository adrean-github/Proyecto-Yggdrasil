from django.db import models


class Agendabox(models.Model):
    fechaagenda = models.DateField(db_column='fechaAgenda')  # Field name made lowercase. The composite primary key (fechaAgenda, horaInicioAgenda, idBox) found, that is not supported. The first column is selected.
    horainicioagenda = models.TimeField(db_column='horaInicioAgenda')  # Field name made lowercase.
    idbox = models.ForeignKey('Box', models.DO_NOTHING, db_column='idBox')  # Field name made lowercase.
    idmedico = models.ForeignKey('Medico', models.DO_NOTHING, db_column='idMedico', blank=True, null=True)  # Field name made lowercase.
    horafinagenda = models.TimeField(db_column='horaFinAgenda', blank=True, null=True)  # Field name made lowercase.
    habilitada = models.IntegerField(db_column='Habilitada')  # Field name made lowercase.

    class Meta:
        managed = False
        db_table = 'agendabox'


class AuthGroup(models.Model):
    name = models.CharField(unique=True, max_length=150)

    class Meta:
        managed = False
        db_table = 'auth_group'


class AuthGroupPermissions(models.Model):
    id = models.BigAutoField(primary_key=True)
    group = models.ForeignKey(AuthGroup, models.DO_NOTHING)
    permission = models.ForeignKey('AuthPermission', models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'auth_group_permissions'
        unique_together = (('group', 'permission'),)


class AuthPermission(models.Model):
    name = models.CharField(max_length=255)
    content_type = models.ForeignKey('DjangoContentType', models.DO_NOTHING)
    codename = models.CharField(max_length=100)

    class Meta:
        managed = False
        db_table = 'auth_permission'
        unique_together = (('content_type', 'codename'),)


class AuthUser(models.Model):
    password = models.CharField(max_length=128)
    last_login = models.DateTimeField(blank=True, null=True)
    is_superuser = models.IntegerField()
    username = models.CharField(unique=True, max_length=150)
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    email = models.CharField(max_length=254)
    is_staff = models.IntegerField()
    is_active = models.IntegerField()
    date_joined = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'auth_user'


class AuthUserGroups(models.Model):
    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(AuthUser, models.DO_NOTHING)
    group = models.ForeignKey(AuthGroup, models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'auth_user_groups'
        unique_together = (('user', 'group'),)


class AuthUserUserPermissions(models.Model):
    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(AuthUser, models.DO_NOTHING)
    permission = models.ForeignKey(AuthPermission, models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'auth_user_user_permissions'
        unique_together = (('user', 'permission'),)



class Tipobox(models.Model):
    idtipobox = models.AutoField(db_column='idTipoBox', primary_key=True)
    tipo = models.CharField(max_length=50, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'tipobox'


class Box(models.Model):
    idbox = models.AutoField(db_column='idBox', primary_key=True)
    estadobox = models.CharField(db_column='estadoBox', max_length=20, blank=True, null=True)
    pasillobox = models.CharField(db_column='pasilloBox', max_length=20, blank=True, null=True)
    comentario = models.TextField(blank=True, null=True)

    tipoboxes = models.ManyToManyField(
        'Tipobox',
        through='Boxtipobox',
        related_name='boxes'
    )

    class Meta:
        managed = False
        db_table = 'box'


class BoxTipoBox(models.Model):
    idbox = models.ForeignKey(Box, on_delete=models.CASCADE, db_column='idBox', primary_key=True)
    idtipobox = models.ForeignKey(Tipobox, on_delete=models.CASCADE, db_column='idTipoBox')
    tipoprincipal = models.BooleanField(db_column='tipoPrincipal', default=False)

    class Meta:
        db_table = 'boxtipobox'
        managed = False  
        unique_together = (('idbox', 'idtipobox'),)



class DjangoAdminLog(models.Model):
    action_time = models.DateTimeField()
    object_id = models.TextField(blank=True, null=True)
    object_repr = models.CharField(max_length=200)
    action_flag = models.PositiveSmallIntegerField()
    change_message = models.TextField()
    content_type = models.ForeignKey('DjangoContentType', models.DO_NOTHING, blank=True, null=True)
    user = models.ForeignKey(AuthUser, models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'django_admin_log'


class DjangoContentType(models.Model):
    app_label = models.CharField(max_length=100)
    model = models.CharField(max_length=100)

    class Meta:
        managed = False
        db_table = 'django_content_type'
        unique_together = (('app_label', 'model'),)


class DjangoMigrations(models.Model):
    id = models.BigAutoField(primary_key=True)
    app = models.CharField(max_length=255)
    name = models.CharField(max_length=255)
    applied = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'django_migrations'


class DjangoSession(models.Model):
    session_key = models.CharField(primary_key=True, max_length=40)
    session_data = models.TextField()
    expire_date = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'django_session'


class Especialidad(models.Model):
    idespecialidad = models.AutoField(db_column='idEspecialidad', primary_key=True)  # Field name made lowercase.
    especialidad = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'especialidad'


class Medico(models.Model):
    idmedico = models.AutoField(db_column='idMedico', primary_key=True)  # Field name made lowercase.
    idespecialidad = models.ForeignKey(Especialidad, models.DO_NOTHING, db_column='idEspecialidad', blank=True, null=True)  # Field name made lowercase.
    nombre = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'medico'




class Atenamb(models.Model):
    idMedico = models.IntegerField()
    idBox = models.CharField(max_length=32)
    fecha = models.DateField()
    horaInicio = models.TimeField()
    horaFin = models.TimeField()

    class Meta:
        managed = False  
        db_table = 'atenamb'

class LogAtenamb(models.Model):
    ACCION_CHOICES = [
        ('INSERT', 'Insert'),
        ('UPDATE', 'Update'),
        ('DELETE', 'Delete'),
    ]

    atenamb_id = models.IntegerField()
    fecha_hora = models.DateTimeField(auto_now_add=False)
    accion = models.CharField(max_length=6, choices=ACCION_CHOICES)

    class Meta:
        db_table = 'log_atenamb'
        managed = False 