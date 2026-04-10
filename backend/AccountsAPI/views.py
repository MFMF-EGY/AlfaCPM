from django.http import JsonResponse
from django.shortcuts import render
from rest_framework.decorators import api_view
from CommercialAPI.models import Projects_Table
from AuthAPI.models import Users
from AccountsAPI.models import Employment
from rest_framework_simplejwt.tokens import RefreshToken

from AuthAPI.views import get_refresh_token_user

@api_view(['GET'])
def get_user_accounts(request):
    filters = request.GET.dict()
    for key in filters:
        if key not in ["email", "user_name", "national_id"]:
            return JsonResponse({"error": f"Invalid filter: {key}"}, status=400)
        
    users = list(
        Users.objects.filter(
            **{f"{key}__contains": value for key, value in filters.items()}
        )
        .all()
        .values("id", "email", "user_name", "national_id", "profile_picture")
    )
    return JsonResponse({"Accounts": users}, status=200)

@api_view(['GET'])
def get_unemployed_users(request):
    filters = request.GET.dict()
    refresh_token = filters.pop("RefreshToken", None)
    if not refresh_token:
        return JsonResponse({"error": "Missing refresh_token"}, status=400)
    if not (project_id := filters.pop("ProjectID")):
        return JsonResponse({"error": "Missing project_id"}, status=400)
    project = Projects_Table.objects.filter(Project_ID=project_id).first()
    if not project:
        return JsonResponse({"error": "Project not found"}, status=404)
    user = get_refresh_token_user(refresh_token)
    if user is None:
        return JsonResponse({"error": "Invalid refresh token"}, status=400)
    if user == 1:
        return JsonResponse({"error": "User not found"}, status=404)
    if project.Project_Owner.id != user.id:
        return JsonResponse({"error": "You are not the owner of this project"}, status=403)
    
    modified_filters = {}
    for key in filters:
        if key not in ["email", "user_name", "national_id"]:
            return JsonResponse({"error": f"Invalid filter: {key}"}, status=400)
        value = filters[key].strip()
        modified_filters[f"{key}__contains"] = value
    unemployed_users = list(
        Users.objects.exclude(id__in=Employment.objects.filter(Project_ID=project).values_list("Account_ID", flat=True))
        .exclude(id = project.Project_Owner.id)
        .filter(**modified_filters)
        .values("id", "email", "user_name", "national_id", "profile_picture")
    )
    return JsonResponse({"UnemployedAccounts": unemployed_users}, status=200)
