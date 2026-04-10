from django.db import models


class Project_Employees(models.Model):
    Employee_ID = models.AutoField(primary_key=True)
    Account_ID = models.IntegerField()
    Employee_Role = models.CharField(max_length=100)
    Creation_DateTime = models.DateTimeField(auto_now_add=True)
    Still_Employee = models.BooleanField(default=True)

    class Meta:
        managed = False

class Employee_Permissions(models.Model):
    Employee_ID = models.ForeignKey(Project_Employees, on_delete=models.CASCADE)
    Can_Add_Store = models.BooleanField(default=False)
    Can_Edit_Store = models.BooleanField(default=False)
    Can_Delete_Store = models.BooleanField(default=False)
    Can_Add_Product = models.BooleanField(default=False)
    Can_Edit_Product = models.BooleanField(default=False)
    Can_View_Sells = models.BooleanField(default=False)
    Can_Sell = models.BooleanField(default=False)
    Can_Edit_Sell = models.BooleanField(default=False)
    Can_Delete_Sell = models.BooleanField(default=False)
    Can_View_Purchases = models.BooleanField(default=False)
    Can_Purchase = models.BooleanField(default=False)
    Can_Edit_Purchase = models.BooleanField(default=False)
    Can_Delete_Purchase = models.BooleanField(default=False)
    Can_View_Transitions = models.BooleanField(default=False)
    Can_Transit = models.BooleanField(default=False)
    Can_Edit_Transition = models.BooleanField(default=False)
    Can_Delete_Transition = models.BooleanField(default=False)
    Can_View_Adjustments = models.BooleanField(default=False)
    Can_Adjust_Quantity = models.BooleanField(default=False)
    Can_Edit_Adjustment = models.BooleanField(default=False)
    Can_Delete_Adjustment = models.BooleanField(default=False)

    class Meta:
        managed = False