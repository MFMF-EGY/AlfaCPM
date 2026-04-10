from django.db import connections
from django.shortcuts import render
from django.http import JsonResponse
from .models import *
from AuthAPI.models import Users
from AccountsAPI.models import Employment
from CommercialAPI.models import Projects_Table
from django.views.decorators.csrf import csrf_exempt
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

class EmployeesList(APIView):
    def get(self, request):
        project_id = request.GET.get("ProjectID", "")
        refresh_token = request.GET.get("RefreshToken", "")
        if not project_id or not refresh_token:
            return JsonResponse({"error": "Project ID and Refresh Token are required"}, status=400)
        try:
            project = Projects_Table.objects.get(Project_ID=project_id)
        except Projects_Table.DoesNotExist:
            return JsonResponse({"error": "Project not found"}, status=404)
        user = RefreshToken(refresh_token)
        if str(project.Project_Owner.id) != user["user_id"]:
            return JsonResponse({"error": "You are not the owner of this project"}, status=403)
        
        employees = Project_Employees.objects.using(f"Project{project_id}").filter(Still_Employee=True)
        employees_accounts_info = list(Users.objects.filter(id__in=[emp.Account_ID for emp in employees]).values("email", "user_name", "national_id", "profile_picture"))

        employee_list = []
        for emp in range(len(employees)):
            employee_list.append({
                "Employee_ID": employees[emp].Employee_ID,
                "email": employees_accounts_info[emp]["email"],
                "user_name": employees_accounts_info[emp]["user_name"],
                "national_id": employees_accounts_info[emp]["national_id"],
                "profile_picture": employees_accounts_info[emp]["profile_picture"]
            })
        return JsonResponse({"Employees": employee_list}, status=200)
    
    def post(self, request):
        project_id = request.data.get("ProjectID", "")
        account_id = request.data.get("AccountID", "")
        refresh_token = request.data.get("RefreshToken", "")
        if not project_id or not account_id or not refresh_token:
            return JsonResponse({"error": "Project ID, Account ID, and Refresh Token are required"}, status=400)
        if not (project := Projects_Table.objects.filter(Project_ID=project_id).first()):
            return JsonResponse({"error": "Project not found"}, status=404)
        user = RefreshToken(refresh_token)
        if str(project.Project_Owner.id) != user["user_id"]:
            return JsonResponse({"error": "You are not the owner of this project"}, status=403)
        if not (user := Users.objects.filter(id=account_id).first()):
            return JsonResponse({"error": "User not found"}, status=404)
        
        employee = Project_Employees.objects.using(f"Project{project_id}").filter(Account_ID=user.id).first()
        if employee and employee.Still_Employee:
            return JsonResponse({"error": "User is already assigned to this project"}, status=400)
        elif not employee:
            new_employee = Project_Employees(Account_ID=user.id, Employee_Role="ﻻ يوجد")
            new_employee.save(using=f"Project{project_id}")
            Employee_Permissions(Employee_ID=new_employee).save(using=f"Project{project_id}")
        elif employee and not employee.Still_Employee:
            employee.Still_Employee = True
            employee.save(using=f"Project{project_id}")
        connections[f"Project{project_id}"].commit()  
        Employment.objects.create(Account_ID=user, Project_ID=project).save()
        return JsonResponse({"message": "User added to project successfully"}, status=201)

    def delete(self, request):
        project_id = request.GET.get("ProjectID", "")
        employee_id = request.GET.get("EmployeeID", "")
        refresh_token = request.GET.get("RefreshToken", "")
        if not project_id or not employee_id or not refresh_token:
            return JsonResponse({"error": "Project ID, Employee ID, and Refresh Token are required"}, status=400)
        if not (project := Projects_Table.objects.filter(Project_ID=project_id).first()):
            return JsonResponse({"error": "Project not found"}, status=404)
        user = RefreshToken(refresh_token)
        if str(project.Project_Owner.id) != user["user_id"]:
            return JsonResponse({"error": "You are not the owner of this project"}, status=403)
        if not (employee := Project_Employees.objects.using(f"Project{project_id}").filter(Employee_ID=employee_id).first()):
            return JsonResponse({"error": "Employee is not assigned to this project"}, status=404)
        employee.Still_Employee = False
        employee.save(using=f"Project{project_id}")
        connections[f"Project{project_id}"].commit()
        Employment.objects.filter(Account_ID=employee.Account_ID, Project_ID=project).delete()
        return JsonResponse({"message": "Employee unassigned from project successfully"}, status=200)

class EmployeePermissions(APIView):
    def get(self, request):
        project_id = request.GET.get("ProjectID", "")
        employee_id = request.GET.get("EmployeeID", "")
        refresh_token = request.GET.get("RefreshToken", "")
        if not project_id or not employee_id or not refresh_token:
            return JsonResponse({"error": "Project ID, Employee ID, and Refresh Token are required"}, status=400)
        if not (project := Projects_Table.objects.filter(Project_ID=project_id).first()):
            return JsonResponse({"error": "Project not found"}, status=404)
        user = RefreshToken(refresh_token)
        if str(project.Project_Owner.id) != user["user_id"]:
            return JsonResponse({"error": "You are not the owner of this project"}, status=403)
        if not (employee := Project_Employees.objects.using(f"Project{project_id}").filter(Employee_ID=employee_id).first()):
            return JsonResponse({"error": "Employee is not assigned to this project"}, status=404)
        
        permissions = Employee_Permissions.objects.using(f"Project{project_id}").filter(Employee_ID=employee).values()
        return JsonResponse({"Permissions": permissions[0]}, status=200)
    
    def put(self, request):
        project_id = request.data.get("ProjectID", "")
        employee_id = request.data.get("EmployeeID", "")
        refresh_token = request.data.get("RefreshToken", "")
        permissions = request.data.get("Permissions", {})
        if not project_id or not employee_id or not refresh_token:
            return JsonResponse({"error": "Project ID, Employee ID, and Refresh Token are required"}, status=400)
        if not permissions:
            return JsonResponse({"error": "Permissions data is required"}, status=400)
        if not (project := Projects_Table.objects.filter(Project_ID=project_id).first()):
            return JsonResponse({"error": "Project not found"}, status=404)
        user = RefreshToken(refresh_token)
        if str(project.Project_Owner.id) != user["user_id"]:
            return JsonResponse({"error": "You are not the owner of this project"}, status=403)
        if not (employee := Project_Employees.objects.using(f"Project{project_id}").filter(Employee_ID=employee_id).first()):
            return JsonResponse({"error": "Employee is not assigned to this project"}, status=404)
        
        employee_permissions = Employee_Permissions.objects.using(f"Project{project_id}").filter(Employee_ID=employee).get()
        for perm in permissions:
            if hasattr(employee_permissions, perm):
                setattr(employee_permissions, perm, permissions[perm])
            else:
                return JsonResponse({"error": f"Invalid permission field: {perm}"}, status=400)
        employee_permissions.save(using=f"Project{project_id}")
        connections[f"Project{project_id}"].commit()
        return JsonResponse({"message": "Permissions updated successfully"}, status=200)