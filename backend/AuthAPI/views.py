import base64
import os
import hashlib
from django.db import connections
from django.shortcuts import render
from django.http import JsonResponse
from django.utils.timezone import now
from django.core.mail import send_mail
from django.utils.crypto import pbkdf2, get_random_string
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.conf import settings
import AuthAPI.models as auth_models
from AuthAPI.models import *
from google.oauth2 import id_token
from google.auth.transport import requests
from rest_framework.decorators import api_view
from rest_framework_simplejwt.tokens import RefreshToken
import jwt

@api_view(["POST"])
def register_user(request):
    first_name = (request.data.get("First_Name") or "").strip()
    second_name = (request.data.get("Second_Name") or "").strip()
    third_name = (request.data.get("Third_Name") or "").strip()
    forth_name = (request.data.get("Fourth_Name") or "").strip()
    password = (request.data.get("Password") or "").strip()
    email = request.data.get("Email", "")
    outh_provider = request.data.get("OAuthProvider", "")
    oauth_token = (request.data.get("OAuthToken") or "").strip()
    profile_picture = (request.data.get("Profile_Picture") or "").strip()
    national_id = (request.data.get("National_ID") or "").strip()
    email_verified = False
    if not email:
        return JsonResponse({"error": "Email is required"}, status=400)
    if not first_name:
        return JsonResponse({"error": "First name is required"}, status=400)
    if not password:
        return JsonResponse({"error": "Password is required"}, status=400)
    existing_user = Users.objects.filter(email=email).first()
    if existing_user:
        return JsonResponse({"error": "User with this email already exists"}, status=400)
    if outh_provider == "google":
        try:
            id_token.verify_oauth2_token(oauth_token, requests.Request(), audience="417283093219-tq3ucsnemrskhnp8eavql9bjjrmq775t.apps.googleusercontent.com")
            email_verified = True
        except ValueError:
            return JsonResponse({"error": "Invalid OAuth token"}, status=400)
        except Exception as e:
            print(e)
    elif not outh_provider:
        pass        
    else:
        return JsonResponse({"error": "Unsupported OAuth provider"}, status=400)
    salt = get_random_string(12)
    hashed_password = pbkdf2(password, salt, 100000, digest=hashlib.sha256)
    hashed_password = base64.b64encode(hashed_password).decode('ascii').strip()
    user = Users(
        first_name=first_name,
        second_name=second_name,
        third_name=third_name,
        fourth_name=forth_name,
        email=email,
        is_active=email_verified,
        password_hash=hashed_password,
        password_salt=salt,
        national_id=national_id,
        profile_picture=profile_picture
    )
    user.save()
    if email_verified:
        return JsonResponse(
            {
                "Status": "User registered successfully",
                "RefreshToken": str(RefreshToken.for_user(user))
            },
            status=201,
        )
    
    email_verification_token = PasswordResetTokenGenerator().make_token(user)
    try:
        send_mail(
            'Verify your email',
            f'Please verify your email by clicking the following link: http://{settings.IP}:8000/apis/v1.0/auth/verify?email={email}&token={email_verification_token}',
            os.getenv('EMAIL_HOST_USER'),
            [email],
            fail_silently=False,
        )
    except Exception as e:
        pass
    return JsonResponse(
        {
            "Status": "User registered successfully. Please verify your email.",
        },
        status=201,
    )

@api_view(["GET"])
def verify_email(request):
    token = request.GET.get("token", "")
    email = request.GET.get("email", "")
    if not token:
        return JsonResponse({"error": "Token not provided"}, status=400)
    user = Users.objects.filter(email=email).first()
    if not user:
        return JsonResponse({"error": "Invalid email"}, status=400)
    if PasswordResetTokenGenerator().check_token(user, token):
        user.is_active = True
        user.save()
        
        return JsonResponse({"Status": "Email verified successfully"}, status=200)
    else:
        return JsonResponse({"error": "Invalid or expired token"}, status=400)

@api_view(["GET"])
def login(request):
    email = (request.GET.get("email") or "").strip()
    password = (request.GET.get("password") or "").strip()
    if not email or not password:
        return JsonResponse({"error": "Email and Password are required"}, status=400)
    user = Users.objects.filter(email=email).first()
    if not user:
        return JsonResponse({"error": "Invalid email or password"}, status=401)
    hashed_password = pbkdf2(password, user.password_salt, 100000, digest=hashlib.sha256)
    hashed_password = base64.b64encode(hashed_password).decode('ascii').strip()
    if hashed_password != user.password_hash:
        return JsonResponse({"error": "Invalid email or password"}, status=401)
    email_verification_token = PasswordResetTokenGenerator().make_token(user)
    if not user.is_active:
        try:
            send_mail(
                'Verify your email',
                f'Please verify your email by clicking the following link: http://{settings.IP}:8000/apis/v1.0/auth/verify?email={email}&token={email_verification_token}',
                os.getenv('EMAIL_HOST_USER'),
                [email],
                fail_silently=False,
            )
        except Exception as e:
            return JsonResponse({"error": "Failed to send verification email"}, status=500)
        return JsonResponse({"error": "Email not verified. Verification email sent."}, status=403)
    user.last_login = now()
    user.save()
    refresh_token = RefreshToken.for_user(user)
    
    return JsonResponse(
        {
            "RefreshToken": str(refresh_token),
            "First_Name": user.first_name,
            "Second_Name": user.second_name,
            "Email": user.email,
            "Profile_Picture": user.profile_picture,
        },
        status=200,
    )

def get_refresh_token_user(refresh_token):
    try:
        token = RefreshToken(refresh_token)
        user_id = token["user_id"]
        user = Users.objects.filter(id=user_id).first()
        if not user:
            return 1
        return user
    except Exception as e:
        return None

@api_view(["GET"])
def validate_refresh_token(request):
    refresh_token = request.GET.get("token", "")
    if not refresh_token:
        return JsonResponse({"error": "Refresh token not provided"}, status=400)
    user = get_refresh_token_user(refresh_token)
    if user is None:
        return JsonResponse({"error": "Invalid refresh token"}, status=400)
    if user == 1:
        return JsonResponse({"error": "User not found"}, status=404)
    if user.is_active == False:
        Users.objects.filter(id=user.id).update(is_active=True)
        
    return JsonResponse(
        {
            "First_Name": user.first_name,
            "Second_Name": user.second_name,
            "Email": user.email,
            "Profile_Picture": user.profile_picture,
        },
        status=200,
    )