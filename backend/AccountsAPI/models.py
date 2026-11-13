from django.db import models
from AuthAPI.models import Users
from CommercialAPI.models import Projects_Table

class Employment(models.Model):
    User_ID = models.ForeignKey(Users, on_delete=models.CASCADE)
    Project_ID = models.ForeignKey(Projects_Table, on_delete=models.CASCADE)

class User_Debt_Accounts(models.Model):
    User_ID = models.ForeignKey(Users, on_delete=models.CASCADE)
    Project_ID = models.ForeignKey(Projects_Table, on_delete=models.CASCADE)