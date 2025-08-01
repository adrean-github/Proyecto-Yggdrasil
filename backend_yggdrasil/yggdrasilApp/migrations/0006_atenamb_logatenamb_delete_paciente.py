# Generated by Django 5.1 on 2025-05-16 23:24

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('yggdrasilApp', '0005_boxtipobox'),
    ]

    operations = [
        migrations.CreateModel(
            name='Atenamb',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('idMedico', models.IntegerField()),
                ('idBox', models.CharField(max_length=32)),
                ('fecha', models.DateField()),
                ('horaInicio', models.TimeField()),
                ('horaFin', models.TimeField()),
            ],
            options={
                'db_table': 'atenamb',
                'managed': False,
            },
        ),
        migrations.CreateModel(
            name='LogAtenamb',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('atenamb_id', models.IntegerField()),
                ('fecha_hora', models.DateTimeField()),
                ('accion', models.CharField(choices=[('INSERT', 'Insert'), ('UPDATE', 'Update'), ('DELETE', 'Delete')], max_length=6)),
            ],
            options={
                'db_table': 'log_atenamb',
                'managed': False,
            },
        ),
        migrations.DeleteModel(
            name='Paciente',
        ),
    ]
