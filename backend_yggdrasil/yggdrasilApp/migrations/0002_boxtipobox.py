# Generated by Django 5.1 on 2025-04-28 14:48

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('yggdrasilApp', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Boxtipobox',
            fields=[
                ('idbox', models.OneToOneField(db_column='idBox', on_delete=django.db.models.deletion.DO_NOTHING, primary_key=True, serialize=False, to='yggdrasilApp.box')),
                ('tipoprincipal', models.IntegerField(blank=True, db_column='tipoPrincipal', null=True)),
            ],
            options={
                'db_table': 'boxtipobox',
                'managed': False,
            },
        ),
    ]
