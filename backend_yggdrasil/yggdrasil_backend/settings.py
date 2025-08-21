from pathlib import Path

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {"hosts": [("127.0.0.1", 6379)]},
    }
}

# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/5.2/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = 'django-insecure-yogo%x7blcgv(75kk)xs@qkqqer%v%kz#=hh=!n&@f-i26uswn'

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = ['*']
# Application definition

ASGI_APPLICATION = 'yggdrasil_backend.asgi.application'

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'yggdrasilApp',
    'corsheaders'
]


MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  
    'django.middleware.common.CommonMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]
CORS_ALLOW_ALL_ORIGINS = True

# Configuración adicional para Cloudflare
CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]

CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",  
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    # URLs de Cloudflare Tunnel
    "https://approach-gst-monaco-desired.trycloudflare.com",  # Frontend
    "https://ui-epic-charts-adopt.trycloudflare.com",         # Backend
]

CORS_ALLOW_CREDENTIALS = True

CORS_ALLOW_HEADERS = [
    'content-type',
    'authorization',
    'x-csrftoken',
    'x-debug',
    'access-control-allow-origin',
    'accept',
    'accept-encoding',
    'cache-control',
]

CSRF_TRUSTED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    # URLs de Cloudflare Tunnel
    "https://approach-gst-monaco-desired.trycloudflare.com",  # Frontend
    "https://ui-epic-charts-adopt.trycloudflare.com",         # Backend
]

ROOT_URLCONF = 'yggdrasil_backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]


WSGI_APPLICATION = 'yggdrasil_backend.wsgi.application'




DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': 'yggdrasil2',
        'USER': 'root',   
        #'PASSWORD': 'alcoy1136',    
        'PASSWORD': '123456',  
        'HOST': 'localhost',
        'PORT': '3306',
    },
    'simulador': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': 'simulador_hospital',
        'USER': 'root',   
        #'PASSWORD': 'alcoy1136',    
        'PASSWORD': '123456',  
        'HOST': 'localhost',
        'PORT': '3306',
    },
    'mongodb': {
        'ENGINE': 'djongo',
        'NAME': 'yggdrasil_mongo',
        'CLIENT': {
            'host': 'mongodb://admin:admin123@localhost:27017/yggdrasil_mongo',
        }
    }
}

# Configuración de MongoDB con MongoEngine
import mongoengine
mongoengine.connect(
    db='yggdrasil_mongo',
    username='admin',
    password='admin123',
    host='localhost',
    port=27017,
    authentication_source='admin'
)


# Password validation
# https://docs.djangoproject.com/en/5.2/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/5.2/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

# Session and Cookie settings for Cloudflare (configuración permisiva para demo)
SESSION_COOKIE_SECURE = False  # False para desarrollo/demo
SESSION_COOKIE_HTTPONLY = False  # False para permitir acceso desde JS
SESSION_COOKIE_SAMESITE = None  # Permite cookies cross-site
CSRF_COOKIE_SECURE = False  # False para desarrollo/demo
CSRF_COOKIE_SAMESITE = None  # Permite cookies cross-site
# SESSION_COOKIE_DOMAIN = '.trycloudflare.com'  # Comentado para demo
# CSRF_COOKIE_DOMAIN = '.trycloudflare.com'  # Comentado para demo

# Trust proxy headers from Cloudflare
USE_TZ = False


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.2/howto/static-files/

STATIC_URL = 'static/'

# Default primary key field type
# https://docs.djangoproject.com/en/5.2/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


LOGIN_URL = '/api/login/' 

SILENCED_SYSTEM_CHECKS = [
    'fields.W342',
]

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
        'rest_framework.authentication.BasicAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',  
    ],
}