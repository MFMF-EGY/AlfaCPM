from django.db import models


class Debt_Accounts(models.Model):
    Person_ID = models.AutoField(primary_key=True)
    Person_Name = models.CharField(max_length=100)
    Creation_DateTime = models.DateTimeField(auto_now_add=True)
    Debt_Amount = models.DecimalField(max_digits=10, decimal_places=2)

class Products_Table(models.Model):
    Product_ID = models.AutoField(primary_key=True)
    Product_Order = models.IntegerField()
    Product_Name = models.CharField(max_length=100)
    Trademark = models.CharField(max_length=100)
    Manufacture_Country = models.CharField(max_length=100)
    Purchase_Price = models.DecimalField(max_digits=10, decimal_places=4)
    Wholesale_Price = models.DecimalField(max_digits=10, decimal_places=4)
    Retail_Price = models.DecimalField(max_digits=10, decimal_places=4)
    Small_Quantity_Unit = models.CharField(max_length=50)
    Large_Quantity_Unit = models.CharField(max_length=50, blank=True)
    Conversion_Rate = models.FloatField(default=1.0)
    Partial_Small_Quantity_Allowed = models.BooleanField(default=False)

class Product_Quantity_Table(models.Model):
    Store_ID = models.ForeignKey('Stores_Table', on_delete=models.CASCADE)
    Product_ID = models.ForeignKey('Products_Table', on_delete=models.CASCADE)
    Quantity = models.FloatField()

class Stores_Table(models.Model):
    Store_ID = models.AutoField(primary_key=True)
    Store_Name = models.CharField(max_length=100)
    Store_Address = models.CharField(max_length=200)

class Selling_Invoices(models.Model):
    Invoice_ID = models.AutoField(primary_key=True)
    Store_ID = models.ForeignKey('Stores_Table', on_delete=models.CASCADE)
    Client_Name = models.CharField(max_length=100)
    DateTime = models.DateTimeField(auto_now_add=True)
    Total_Price = models.DecimalField(max_digits=10, decimal_places=2)
    Paid = models.DecimalField(max_digits=10, decimal_places=2)
    Transferred_To_Debt_Account = models.DecimalField(max_digits=10, decimal_places=2)

class Selling_Items(models.Model):
    Invoice_ID = models.ForeignKey('Selling_Invoices', on_delete=models.CASCADE)
    Product_ID = models.ForeignKey('Products_Table', on_delete=models.CASCADE)
    Purchase_Price = models.DecimalField(max_digits=10, decimal_places=4)
    Quantity = models.FloatField()
    Convertion_Rate = models.FloatField()
    Unit_Price = models.DecimalField(max_digits=10, decimal_places=4)

class Purchase_Invoices(models.Model):
    Invoice_ID = models.AutoField(primary_key=True)
    Store_ID = models.ForeignKey('Stores_Table', on_delete=models.CASCADE)
    Seller_Name = models.CharField(max_length=100)
    DateTime = models.DateTimeField(auto_now_add=True)
    Total_Price = models.DecimalField(max_digits=10, decimal_places=2)
    Paid = models.DecimalField(max_digits=10, decimal_places=2)
    Deducted_From_Debt_Account = models.DecimalField(max_digits=10, decimal_places=2)

class Purchase_Items(models.Model):
    Invoice_ID = models.ForeignKey('Purchase_Invoices', on_delete=models.CASCADE)
    Product_ID = models.ForeignKey('Products_Table', on_delete=models.CASCADE)
    Quantity = models.FloatField()
    Convertion_Rate = models.FloatField()
    Unit_Price = models.DecimalField(max_digits=10, decimal_places=4)

class Transition_Documents(models.Model):
    Document_ID = models.AutoField(primary_key=True)
    Source_Store_ID = models.ForeignKey(
        'Stores_Table',
        on_delete=models.CASCADE,
        related_name='outgoing_transitions'
    )
    Destination_Store_ID = models.ForeignKey(
        'Stores_Table',
        on_delete=models.CASCADE,
        related_name='incoming_transitions'
    )
    DateTime = models.DateTimeField(auto_now_add=True)

class Transition_Items(models.Model):
    Document_ID = models.ForeignKey('Transition_Documents', on_delete=models.CASCADE)
    Product_ID = models.ForeignKey('Products_Table', on_delete=models.CASCADE)
    Quantity = models.FloatField()

class Products_Quantities_Adjustments(models.Model):
    Operation_ID = models.AutoField(primary_key=True)
    Store_ID = models.ForeignKey('Stores_Table', on_delete=models.CASCADE)
    DateTime = models.DateTimeField(auto_now_add=True)
    Operation_Type = models.CharField(max_length=50)  # MoreThanPurchaseInvoice, LessThanPurchaseInvoice, Damaged, Fixed, Lost, Found
    Product_ID = models.ForeignKey('Products_Table', on_delete=models.CASCADE)
    Quantity = models.FloatField()
    Note = models.TextField(blank=True)

class Debt_Accounts_Operations(models.Model):
    Operation_ID = models.AutoField(primary_key=True)
    Person_ID = models.ForeignKey('Debt_Accounts', on_delete=models.CASCADE)
    DateTime = models.DateTimeField(auto_now_add=True)
    Operation_Type = models.CharField(max_length=50)  # e.g., "Credit" or "Debit"
    Related_Document_ID = models.IntegerField(null=True)
    Required_Amount = models.DecimalField(max_digits=10, decimal_places=2)
    Paid = models.DecimalField(max_digits=10, decimal_places=2)
    Remaining_Amount = models.DecimalField(max_digits=10, decimal_places=2)
    Debt_Balance = models.DecimalField(max_digits=10, decimal_places=2)
    Note = models.TextField(blank=True)