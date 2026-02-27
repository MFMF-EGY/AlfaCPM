"""
URL configuration for backend project.

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
import CommercialAPI.views
import AuthAPI.views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('apis/v1.0/commercial', CommercialAPI.views.StartRequestProcessing),
    path('apis/v1.0/auth/register', AuthAPI.views.register_user),
    path('apis/v1.0/auth/refresh', AuthAPI.views.validate_refresh_token),
    path('apis/v1.0/auth/verify', AuthAPI.views.verify_email),
    path('apis/v1.0/auth/login', AuthAPI.views.login),
    #path('apis/v1.0/auth/request_password_reset', AuthAPI.views.request_password_reset),
    #path('apis/v1.0/auth/reset_password', AuthAPI.views.reset_password),
]
