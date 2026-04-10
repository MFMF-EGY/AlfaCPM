from django.db import models
from AuthAPI.models import Users

class Projects_Table(models.Model):
    Project_ID = models.AutoField(primary_key=True)
    Project_Name = models.CharField(max_length=100)
    Project_Description = models.TextField(blank=True)
    Project_Owner = models.ForeignKey(Users, on_delete=models.CASCADE)
    Creation_DateTime = models.DateTimeField(auto_now_add=True)
