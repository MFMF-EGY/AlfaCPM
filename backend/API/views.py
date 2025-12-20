from django.shortcuts import render
from django.http import JsonResponse
from django.db import connections
from django.conf import settings
from django.db.backends.mysql.base import CursorWrapper
from django.db.models import Max, Q, F
import os
import subprocess
from datetime import datetime
from decimal import Decimal
import API.models as project_db_structure
from API.models import *

global SELLING_INVOICE_LENGTH, PURCHASE_INVOICE_LENGTH, REFUND_INVOICE_LENGTH, TRANSITION_DOCUMENT_LENGTH
SELLING_INVOICE_LENGTH = 12
PURCHASE_INVOICE_LENGTH = 12
REFUND_INVOICE_LENGTH = 12
TRANSITION_DOCUMENT_LENGTH = 12


connections.databases["MainDB"] = {
    'ENGINE': 'django.db.backends.mysql',
    'NAME': 'MainDB',
    'HOST': 'localhost',
    'PORT': '3306',
    'USER': 'alfacpm',
    'PASSWORD': '000600',
    'OPTIONS': {
        'charset': 'utf8mb4'
    },
    'AUTOCOMMIT': False,
    'TIME_ZONE': settings.TIME_ZONE,
    'CONN_HEALTH_CHECKS': False,
    'CONN_MAX_AGE': 0,
    'ATOMIC_REQUESTS': False,
    'TEST': {
        'NAME': 'MainDB',
        'MIRROR': None,
        'CHARSET': None,
        'COLLATION': None,
        'MIGRATE': False,
    },
}
ProjectsDBsConnectors = {}
MainDBCursor = connections["MainDB"].cursor()

# Enable dictionary fetches for Django cursor
CursorWrapper.dictfetchall = lambda self: [
    dict(zip([col[0] for col in self.description], row))
    for row in self.fetchall()
]
CursorWrapper.dictfetchone = lambda self: (
    dict(zip([col[0] for col in self.description], self.fetchone()))
    if self.rowcount > 0 else None
)
def SetupProjectsDBsConnectors():
    MainDBCursor.execute("SELECT Project_ID FROM Projects_Table;")
    ProjectsIDs = MainDBCursor.fetchall()
    for ProjectID in ProjectsIDs:
        connections.databases[f"Project{ProjectID[0]}"] = {
            'ENGINE': 'django.db.backends.mysql',
            'NAME': f"Project{ProjectID[0]}",
            'HOST': 'localhost',
            'PORT': '3306',
            'USER': 'alfacpm',
            'PASSWORD': '000600',
            'OPTIONS': {
                'charset': 'utf8mb4'
            },
            'AUTOCOMMIT': False,
            'TIME_ZONE': settings.TIME_ZONE,
            'CONN_HEALTH_CHECKS': False,
            'CONN_MAX_AGE': 0,
            'ATOMIC_REQUESTS': False,
            'TEST': {
                'NAME': f"Project{ProjectID[0]}",
                'MIRROR': None,
                'CHARSET': None,
                'COLLATION': None,
                'MIGRATE': False,
            },
        }
        ProjectsDBsConnectors[ProjectID[0]] = 1

SetupProjectsDBsConnectors()
GeneratedSql = ""
class ErrorCodes:
    InvalidDataType = 1
    MissingVariables = 2
    EmptyValue = 3
    RedundantValue = 4
    ValueNotFound = 5
    InsufficientQuantity = 6
    ExcessQuantity = 7
    NoStoresExist = 8
    UnregisteredStore = 9
    UnregisteredProduct = 10
    UnregisteredPerson = 11
    ExceededMaximum = 12
    InvalidValue = 13
    NonexistentProduct = 14
def isnumberstr(value):
    try:
        float(value)
        return True
    except:
        return False
    
def isintstr(value):
    try:
        int(value)
        return True
    except:
        return False


class ProcessRequest:
    @staticmethod
    def CreateProject(RequestList, Test = False):
        ProjectName, ProjectDescription = RequestList["ProjectName"], RequestList["ProjectDescription"]
        if len(ProjectName) == 0:
            return {"StatusCode":ErrorCodes.EmptyValue,"Variable":"ProjectName"}
        # This name is used for testing
        if ProjectName == "foo" and not Test:
            return {"StatusCode":ErrorCodes.InvalidValue,"Variable":"ProjectName"}
        # Check if project has unique name
        MainDBCursor.execute(f"SELECT Project_Name FROM Projects_Table WHERE Project_Name = '{RequestList["ProjectName"]}'");
        if MainDBCursor.fetchone() is not None:
            return {"StatusCode":ErrorCodes.RedundantValue,"Variable":"ProjectName"}
        
        MainDBCursor.execute("INSERT INTO Projects_Table(Project_Name,Project_Description) VALUES ('%s','%s')" % (ProjectName,ProjectDescription))
        MainDBCursor.execute("SELECT LAST_INSERT_ID();")
        ProjectID = MainDBCursor.fetchone()[0]
        MainDBCursor.execute(f"CREATE DATABASE Project{ProjectID};")
        
        connections.databases[f"Project{ProjectID}"] = {
            'ENGINE': 'django.db.backends.mysql',
            'NAME': f"Project{ProjectID}",
            'HOST': 'localhost',
            'PORT': '3306',
            'USER': 'alfacpm',
            'PASSWORD': '000600',
            'OPTIONS': {
                'charset': 'utf8mb4'
            },
            'AUTOCOMMIT': False,
            'TIME_ZONE': settings.TIME_ZONE,
            'CONN_HEALTH_CHECKS': False,
            'CONN_MAX_AGE': 0,
            'ATOMIC_REQUESTS': False,
            'TEST': {
                'NAME': f"Project{ProjectID}",
                'MIRROR': None,
                'CHARSET': None,
                'COLLATION': None,
                'MIGRATE': False,
            },
        }
        NewDBCursor = connections[f"Project{ProjectID}"].cursor()
        with connections[f"Project{ProjectID}"].schema_editor() as schema_editor:
            for model_name in dir(project_db_structure):
                model = getattr(project_db_structure, model_name)
                if hasattr(model, '_meta'):
                    schema_editor.create_model(model)
        connections[f"Project{ProjectID}"].commit()
        NewDBCursor.close()
        connections["MainDB"].commit()
        MainDBCursor.execute("USE MainDB;")
        ProjectsDBsConnectors[ProjectID] = 1
        if Test:
            return ProjectID
        return {"StatusCode":0,"Data":"OK"}

    @staticmethod
    def GetProjects():
        MainDBCursor.execute("SELECT * FROM Projects_Table;")
        return {"StatusCode":0,"Data":MainDBCursor.dictfetchall()}
    
    @staticmethod
    def CreateAccount(DBName, RequestList):
        PersonName = RequestList["PersonName"]
        new_debt_account = Debt_Accounts(Person_Name=PersonName, Debt_Amount=0)
        new_debt_account.save(using=DBName)
        connections[DBName].commit()
        return {"StatusCode":0,"Data":"OK"}

    @staticmethod
    def AddStore(DBName , RequestList):
        StoreName, StoreAddress = RequestList["StoreName"], RequestList["StoreAddress"]
        ProductIDs = list(Products_Table.objects.using(DBName).all().values("Product_ID"))
        new_store = Stores_Table(Store_Name=StoreName, Store_Address=StoreAddress)
        new_store.save(using=DBName)
        for ProductID in ProductIDs:
            new_product_quantity = Product_Quantity_Table(Store_ID=new_store, Product_ID=Products_Table.objects.using(DBName).get(Product_ID=ProductID["Product_ID"]), Quantity=0)
            new_product_quantity.save(using=DBName)
        connections[DBName].commit()
        return {"StatusCode":0,"Data":"OK"}

    @staticmethod
    def GetStores(DBName):
        return {"StatusCode":0,"Data":list(Stores_Table.objects.using(DBName).all().values())}

    @staticmethod
    def AddProduct(DBName, RequestList):
        ProductName, Trademark, ManufactureCountry, PurchasePrice, WholesalePrice, RetailPrice, QuantityUnit = (
            RequestList["ProductName"], RequestList["Trademark"],
            RequestList["ManufactureCountry"], RequestList["PurchasePrice"], RequestList["WholesalePrice"],
            RequestList["RetailPrice"], RequestList["QuantityUnit"])
        #Check if Product already exist with the same trademark
        if Products_Table.objects.using(DBName).filter(Product_Name=ProductName, Trademark=Trademark).exists():
            return {"StatusCode":ErrorCodes.RedundantValue,"Data":""}
        StoresIDs = list(Stores_Table.objects.using(DBName).all())
        if RequestList.get("ProductOrder") is None:
            new_product = Products_Table(
                Product_Order = Products_Table.objects.using(DBName).aggregate(Max('Product_Order'))['Product_Order__max'] + 1 if Products_Table.objects.using(DBName).exists() else 1,
                Product_Name=ProductName, Trademark=Trademark, Manufacture_Country=ManufactureCountry,
                Purchase_Price=PurchasePrice, Wholesale_Price=WholesalePrice, Retail_Price=RetailPrice,
                Quantity_Unit=QuantityUnit
            )
            new_product.save(using=DBName)
        else:
            Order = RequestList["ProductOrder"]
            Products_Table.objects.using(DBName).filter(Product_Order__gte=Order).update(Product_Order=F('Product_Order') + 1)
            new_product = Products_Table(
                Product_Order = Order,
                Product_Name=ProductName, Trademark=Trademark, Manufacture_Country=ManufactureCountry,
                Purchase_Price=PurchasePrice, Wholesale_Price=WholesalePrice, Retail_Price=RetailPrice,
                Quantity_Unit=QuantityUnit
            )
            new_product.save(using=DBName)
        for StoreID in StoresIDs:
            new_product_quantity = Product_Quantity_Table(
                Store_ID = StoreID,
                Product_ID=new_product,
                Quantity=0
            )
            new_product_quantity.save(using=DBName)
        connections[DBName].commit()
        return {"StatusCode": 0,"Data": "OK"}

    @staticmethod
    def EditProductInfo(DBName, RequestList):
        ProductID, ProductName, Trademark, ManufactureCountry, PurchasePrice, WholesalePrice, RetailPrice, QuantityUnit = (
            RequestList["ProductID"], RequestList["ProductName"], RequestList["Trademark"],
            RequestList["ManufactureCountry"], RequestList["PurchasePrice"], RequestList["WholesalePrice"],
            RequestList["RetailPrice"], RequestList["QuantityUnit"])
        
        product = Products_Table.objects.using(DBName).get(Product_ID=ProductID)
        product.Product_Name = ProductName
        product.Trademark = Trademark
        product.Manufacture_Country = ManufactureCountry
        product.Purchase_Price = PurchasePrice
        product.Wholesale_Price = WholesalePrice
        product.Retail_Price = RetailPrice
        product.Quantity_Unit = QuantityUnit
        product.save(using=DBName)
        connections[DBName].commit()
        return {"StatusCode":0,"Data":"OK"}

    @staticmethod
    def GetProductInfo(DBName, RequestList):
        ProductID = RequestList['ProductID']
        product = Products_Table.objects.using(DBName).get(Product_ID=ProductID)
        product_quantity_table = Product_Quantity_Table.objects.using(DBName).filter(Product_ID=ProductID).values('Store_ID', 'Quantity')
        ProductInfo = {**product.__dict__, 'Quantities': list(product_quantity_table)}
        del ProductInfo['_state']
        return {"StatusCode": 0,"Data": ProductInfo}
    
    
    @staticmethod
    def GetProductsQuantities(DBName, RequestList, ProductsIDs, store):
        #Cursor.execute(f"SELECT Quantity FROM Product_Quantity_Table WHERE Store_ID={StoreID} AND Product_ID IN ({','.join(map(str, ProductsIDs))});")
        #ProductQuantities = Cursor.fetchall()
        #ProductQuantities = [ProductQuantity[0] for ProductQuantity in ProductQuantities]
        ProductsQuantities = Product_Quantity_Table.objects.using(DBName).filter(Store_ID=store, Product_ID__in=ProductsIDs).values('Product_ID', 'Quantity')
        return {"StatusCode":0,"Data":list(ProductsQuantities)}

    @staticmethod
    def Sell(DBName, RequestList, Orders, RequiredAmount, store):
        ClientName, Paid = RequestList["ClientName"], RequestList["Paid"]
        InsufficentQuantityProducts = []
        # For every ordered product check if product has sufficient quantity
        for Order in Orders:
            product_quantity = Product_Quantity_Table.objects.using(DBName).get(Store_ID=store, Product_ID=Order["ProductID"])
            if product_quantity.Quantity < Order["Quantity"]:
                InsufficentQuantityProducts.append(Order["ProductID"])
        if InsufficentQuantityProducts:
            return {"StatusCode":ErrorCodes.InsufficientQuantity,"ProductsIDs":InsufficentQuantityProducts}
        selling_invoice = Selling_Invoices(
            Store_ID = store,
            Client_Name = ClientName,
            Total_Price = RequiredAmount,
            Paid = Paid,
            Transferred_To_Debt_Account = RequiredAmount - Paid
        )
        selling_invoice.save(using=DBName)
        for Order in Orders:
            selling_item = Selling_Items(
                Invoice_ID = selling_invoice,
                Product_ID = Products_Table.objects.using(DBName).get(Product_ID=Order["ProductID"]),
                Quantity = Decimal(Order["Quantity"]),
                Purchase_Price = Products_Table.objects.using(DBName).get(Product_ID=Order["ProductID"]).Purchase_Price,
                Unit_Price = Order["UnitPrice"]
            )
            selling_item.save(using=DBName)
            product_quantity = Product_Quantity_Table.objects.using(DBName).get(Store_ID=store, Product_ID=Order["ProductID"])
            product_quantity.Quantity = Decimal(product_quantity.Quantity) - Order["Quantity"]
            product_quantity.save(using=DBName)
        connections[DBName].commit()
        return {"StatusCode":0,"Data":"OK"}
    
    @staticmethod
    def Purchase(DBName, RequestList, Orders, TotalPrice, store):
        SellerName, Paid = RequestList["SellerName"], RequestList["Paid"]
        purchase_invoice = Purchase_Invoices(
            Store_ID = store,
            Seller_Name = SellerName,
            Total_Price = TotalPrice,
            Paid = Paid,
            Deducted_From_Debt_Account = TotalPrice - Paid
        )
        purchase_invoice.save(using=DBName)
        for Order in Orders:
            product = Products_Table.objects.using(DBName).get(Product_ID=Order["ProductID"])
            purchase_item = Purchase_Items(
                Invoice_ID = purchase_invoice,
                Product_ID = product,
                Quantity = Order["Quantity"],
                Unit_Price = Order["UnitPrice"]
            )
            purchase_item.save(using=DBName)
            product_quantity = Product_Quantity_Table.objects.using(DBName).get(Store_ID=store, Product_ID=Order["ProductID"])
            product_quantity.Quantity = Decimal(product_quantity.Quantity) + Order["Quantity"]
            product_quantity.save(using=DBName)
        connections[DBName].commit()
        return {"StatusCode":0,"Data":"OK"}

    @staticmethod
    def EditSellingInvoice(DBName, selling_invoice: Selling_Invoices, RequestList, Orders, TotalPrice):
        ClientName, Paid = RequestList["ClientName"], RequestList["Paid"]
        # Return invoice items quantities to the store and delete those items.
        selling_invoice_items = Selling_Items.objects.using(DBName).filter(Invoice_ID=selling_invoice.Invoice_ID)
        for Item in selling_invoice_items:
            product_quantity = Product_Quantity_Table.objects.using(DBName).get(Store_ID=selling_invoice.Store_ID, Product_ID=Item.Product_ID)
            #product_quantity.Quantity = F(product_quantity.Quantity) + F(Item.Quantity)
            
            product_quantity.save(using=DBName)
        selling_invoice_items.delete()
        # Check if store has sufficient quantity for every ordered product after editing
        # then deduct the new quantities and insert the new items to the invoice
        InsufficientQuantityProducts = []
        for Order in Orders:
            available_quantity = Product_Quantity_Table.objects.using(DBName).get(Store_ID=selling_invoice.Store_ID, Product_ID=Order["ProductID"])
            if available_quantity.Quantity < Order["Quantity"]:
                InsufficientQuantityProducts.append(Order["ProductID"])
                continue
            available_quantity.Quantity = Decimal(available_quantity.Quantity) - Decimal(Order["Quantity"])
            available_quantity.save(using=DBName)
            product = Products_Table.objects.using(DBName).get(Product_ID=Order["ProductID"])
            new_item = Selling_Items(
                Invoice_ID = selling_invoice,
                Product_ID = product,
                Purchase_Price = product.Purchase_Price,
                Quantity = Order["Quantity"],
                Unit_Price = Order["UnitPrice"]
            )
            new_item.save(using=DBName)
        if InsufficientQuantityProducts:
            return {"StatusCode":ErrorCodes.InsufficientQuantity,"ProductsIDs":InsufficientQuantityProducts} 
        # Edit invoice info
        selling_invoice.Client_Name = ClientName
        selling_invoice.Total_Price = TotalPrice
        selling_invoice.Paid = Paid
        selling_invoice.Transferred_To_Debt_Account = TotalPrice - Paid
        selling_invoice.save(using=DBName)
        connections[DBName].commit()
        return {"StatusCode":0,"Data":"OK"}

    @staticmethod
    def EditPurchaseInvoice(DBName, purchase_invoice: Purchase_Invoices, RequestList, Orders, TotalPrice):
        SellerName, Paid = RequestList["SellerName"], RequestList["Paid"]
        # Subtract invoice items quantities to the store and delete those items.
        purchase_invoice_items = list(Purchase_Items.objects.using(DBName).filter(Invoice_ID=purchase_invoice.Invoice_ID))
        for item in purchase_invoice_items:
            product_quantity = Product_Quantity_Table.objects.using(DBName).get(Store_ID=purchase_invoice.Store_ID, Product_ID=item.Product_ID)
            product_quantity.Quantity = Decimal(product_quantity.Quantity) - Decimal(item.Quantity)
            product_quantity.save(using=DBName)
        
        # Add quantities and insert the new items to the invoice
        for Order in Orders:
            existing_quantity = Product_Quantity_Table.objects.using(DBName).get(Store_ID=purchase_invoice.Store_ID, Product_ID=Order["ProductID"])
            existing_quantity.Quantity = Decimal(existing_quantity.Quantity) + Decimal(Order["Quantity"])
            existing_quantity.save(using=DBName)
            product = Products_Table.objects.using(DBName).get(Product_ID=Order["ProductID"])
            new_item = Purchase_Items(
                Invoice_ID=purchase_invoice,
                Product_ID=product,
                Quantity=Order["Quantity"],
                Unit_Price=Order["UnitPrice"]
            )
            new_item.save(using=DBName)
        # Check if any product has negative quantity after editing
        InsufficientQuantityProducts = []
        for Item in purchase_invoice_items:
            existing_quantity = Product_Quantity_Table.objects.using(DBName).get(Store_ID=purchase_invoice.Store_ID, Product_ID=Item.Product_ID)
            if existing_quantity.Quantity < 0:
                InsufficientQuantityProducts.append(Item.Product_ID)
                continue
            # Delete old item
            Item.delete(using=DBName)
        if InsufficientQuantityProducts:
            return {"StatusCode":ErrorCodes.InsufficientQuantity,"ProductsIDs":InsufficientQuantityProducts}
        # Edit invoice info
        purchase_invoice.Seller_Name = SellerName
        purchase_invoice.Total_Price = TotalPrice
        purchase_invoice.Paid = Paid
        purchase_invoice.Deducted_From_Debt_Account = TotalPrice - Paid
        purchase_invoice.save(using=DBName)
        connections[DBName].commit()
        return {"StatusCode":0,"Data":"OK"}

    @staticmethod
    def EditTransitionDocument(DBName, transition_document: Transition_Documents, destination_store, RequestList, Orders):
        # Return quantities to source store and deduct from destination store
        old_transition_document_items = list(Transition_Items.objects.using(DBName).filter(Document_ID=transition_document.Document_ID))
        for Item in old_transition_document_items:
            Product_Quantity_Table.objects.using(DBName).filter(
                Product_ID = Item.Product_ID,
                Store_ID = transition_document.Destination_Store_ID
            ).update(Quantity=F('Quantity') - Item.Quantity)
            Product_Quantity_Table.objects.using(DBName).filter(
                Product_ID=Item.Product_ID,
                Store_ID=transition_document.Source_Store_ID
            ).update(Quantity=F('Quantity') + Item.Quantity)
        InsufficentDestinationQuantityProducts = []
        # Transit quantities according to new orders, check if destination store quantity is positive and insert new doucment items
        for Order in Orders:
            product = Products_Table.objects.using(DBName).get(Product_ID=Order["ProductID"])
            # Add to destination store quantity and check if quantity is positive.
            destination_store_quantity = Product_Quantity_Table.objects.using(DBName).get(Product_ID=product, Store_ID=destination_store)
            destination_store_quantity.Quantity = Decimal(destination_store_quantity.Quantity) + Decimal(Order["Quantity"])
            if destination_store_quantity.Quantity < 0:
                InsufficentDestinationQuantityProducts.append(Order["ProductID"])
                continue
            destination_store_quantity.save(using=DBName)
            # Subtract from source store quantity.
            Product_Quantity_Table.objects.using(DBName).filter(
                Product_ID = product,
                Store_ID = transition_document.Source_Store_ID
            ).update(Quantity=F('Quantity') - Order["Quantity"])
            new_item = Transition_Items(
                Document_ID = transition_document,
                Product_ID = product,
                Quantity = Order["Quantity"]
            )
            new_item.save(using=DBName)
        if InsufficentDestinationQuantityProducts:
            return {"StatusCode":ErrorCodes.InsufficientQuantity,"Store":"Destination","ProductsIDs":InsufficentDestinationQuantityProducts}
        # Check if source store has negative quantity for any product
        InsufficientSourceQuantityProducts = []
        for Item in old_transition_document_items:
            source_store_quantity = Product_Quantity_Table.objects.using(DBName).get(Product_ID=Item.Product_ID, Store_ID=transition_document.Source_Store_ID)
            if source_store_quantity.Quantity < 0:
                InsufficientSourceQuantityProducts.append(Item.Product_ID)
                continue
            Item.delete(using=DBName)
        if InsufficientSourceQuantityProducts:
            return {"StatusCode":ErrorCodes.InsufficientQuantity,"Store":"Source","ProductsIDs":InsufficientSourceQuantityProducts}
        # Edit document info
        transition_document.Destination_Store_ID = destination_store
        connections[DBName].commit()
        return {"StatusCode":0,"Data":"OK"}
    
    @staticmethod
    def DeletePurchaseInvoice(DBName, purchase_invoice: Purchase_Invoices):
        invoice_items = Purchase_Items.objects.using(DBName).filter(Invoice_ID=purchase_invoice.Invoice_ID)
        for Item in invoice_items:
            ItemID, ItemQuantity = Item.Product_ID, Item.Quantity
            existing_quantity = Product_Quantity_Table.objects.using(DBName).get(Product_ID=ItemID, Store_ID=purchase_invoice.Store_ID)
            if existing_quantity.Quantity < ItemQuantity:
                return {"StatusCode":ErrorCodes.InsufficientQuantity,"ProductID":ItemID}
            existing_quantity.Quantity = Decimal(existing_quantity.Quantity) - Decimal(ItemQuantity)
            existing_quantity.save(using=DBName)
            Item.delete(using=DBName)
        purchase_invoice.delete(using=DBName)
        connections[DBName].commit()
        return {"StatusCode":0,"Data":"OK"}

    @staticmethod
    def DeleteSellingInvoice(DBName, selling_invoice: Selling_Invoices):
        InvoiceID = selling_invoice.Invoice_ID
        selling_items = Selling_Items.objects.using(DBName).filter(Invoice_ID=InvoiceID)
        for Item in selling_items:
            Product_Quantity_Table.objects.using(DBName).filter(
                Product_ID = Item.Product_ID,
                Store_ID = selling_invoice.Store_ID
            ).update(Quantity=F('Quantity') + Item.Quantity)
            Item.delete(using=DBName)
        selling_invoice.delete(using=DBName)
        connections[DBName].commit()
        return {"StatusCode":0,"Data":"OK"}

    @staticmethod
    def DeleteTransitionDocument(DBName, transition_document: Transition_Documents):
        SourceStoreID, DestinationStoreID = transition_document.Source_Store_ID, transition_document.Destination_Store_ID
        transited_items = Transition_Items.objects.using(DBName).filter(Document_ID=transition_document.Document_ID) 
        for Item in transited_items:
            destination_store_quantity = Product_Quantity_Table.objects.using(DBName).get(Product_ID=Item.Product_ID, Store_ID=DestinationStoreID)
            if destination_store_quantity.Quantity < Item.Quantity:
                return {"StatusCode":ErrorCodes.InsufficientQuantity,"ProductID":Item.Product_ID}
            destination_store_quantity.Quantity = Decimal(destination_store_quantity.Quantity) - Decimal(Item.Quantity)
            destination_store_quantity.save(using=DBName)
            Product_Quantity_Table.objects.using(DBName).filter(
                Product_ID = Item.Product_ID,
                Store_ID = SourceStoreID
            ).update(Quantity=F('Quantity') + Item.Quantity)
            Item.delete(using=DBName)
        transition_document.delete(using=DBName)
        connections[DBName].commit()
        return {"StatusCode":0,"Data":"OK"}
    
    @staticmethod
    def DeleteAdjustmentOperation(DBName, adjustment_operation: Products_Quantities_Adjustments):
        StoreID, ProductID, OperationType, Quantity = adjustment_operation.Store_ID, adjustment_operation.Product_ID, adjustment_operation.Operation_Type, adjustment_operation.Quantity
        if OperationType in ["MoreThanPurchaseInvoice", "Fixed", "Found"]:
            product_quantity = Product_Quantity_Table.objects.using(DBName).get(Store_ID=StoreID, Product_ID=ProductID)
            if product_quantity.Quantity < Quantity:
                return {"StatusCode":ErrorCodes.InsufficientQuantity,"ProductID":ProductID}
            product_quantity.Quantity = Decimal(product_quantity.Quantity) - Decimal(Quantity)
            product_quantity.save(using=DBName)
        else:
            # product_quantity = Product_Quantity_Table.objects.using(DBName).get(Store_ID=StoreID, Product_ID=ProductID)
            # product_quantity.Quantity = Decimal(product_quantity.Quantity) + Decimal(Quantity)
            # product_quantity.save(using=DBName)
            Product_Quantity_Table.objects.using(DBName).filter(
                Store_ID = StoreID,
                Product_ID = ProductID
            ).update(Quantity=F('Quantity') + Quantity)
        adjustment_operation.delete(using=DBName)
        connections[DBName].commit()
        return {"StatusCode":0,"Data":"OK"}
    
    @staticmethod
    def AddToAccount(RequestList):
        PersonID = RequestList["PersonID"]
        Description = RequestList["Description"]
        Amount = RequestList["Amount"]
        Cursor.execute(f"SELECT Person_ID FROM Debt_Accounts WHERE Person_ID = {PersonID}")
        if not Cursor.fetchone():
            return {"StatusCode":ErrorCodes.UnregisteredPerson,"Data":""}
        Cursor.execute(f"INSERT INTO Accounts_Operations('Person_ID','Description','Required') VALUES ('{PersonID}','{Description}','{Amount}')\n")
        Cursor.execute(f"SET @Old_Balance = (SELECT Balance FROM Accounts WHERE Person_ID = {PersonID});\n")
        Cursor.execute(f"UPDATE Accounts SET Balance = @Old_Balance+{Amount} WHERE Person_ID = {PersonID};\n")
        ProjectDBConnector.commit()
        return {"StatusCode":0,"Data":"OK"}
    @staticmethod
    def DeductFromAccount(RequestList):
        PersonID = RequestList["PersonID"]
        Description = RequestList["Description"]
        Amount = RequestList["Amount"]
        Cursor.execute(f"SELECT Person_ID FROM Debt_Accounts WHERE Person_ID = {PersonID}")
        if not Cursor.fetchone():
            return {"StatusCode":ErrorCodes.UnregisteredPerson,"Data":""}
        Cursor.execute(
            f"INSERT INTO Accounts_Operations('Person_ID','Description','Required') VALUES ('{PersonID}','{Description}','{Amount}')\n")
        Cursor.execute(f"SET @Old_Balance = (SELECT Balance FROM Accounts WHERE Person_ID = {PersonID});\n")
        Cursor.execute(f"UPDATE Accounts SET Balance = @Old_Balance-{Amount} WHERE Person_ID = {PersonID};\n")
        ProjectDBConnector.commit()
        return {"StatusCode":0,"Data":"OK"}
    
    @staticmethod
    def Transit(DBName, Orders, source_store, destination_store):
        InsufficientQuantityProducts = []
        for i in range(len(Orders)):
            Orders[i]["ProductID"] = Products_Table.objects.using(DBName).get(Product_ID=Orders[i]["ProductID"])
            Order = Orders[i]
            existing_quantity = Product_Quantity_Table.objects.using(DBName).get(Product_ID=Order['ProductID'], Store_ID=source_store)
            if existing_quantity.Quantity < Order['Quantity']:
                InsufficientQuantityProducts.append(Order['ProductID'])
                continue
            Product_Quantity_Table.objects.using(DBName).filter(Product_ID=Order['ProductID'], Store_ID=source_store).update(Quantity=F('Quantity') - Order['Quantity'])
            Product_Quantity_Table.objects.using(DBName).filter(Product_ID=Order['ProductID'], Store_ID=destination_store).update(Quantity=F('Quantity') + Order['Quantity'])
        if InsufficientQuantityProducts:
            return {"StatusCode": ErrorCodes.InsufficientQuantity,"ProductsIDs": InsufficientQuantityProducts}
        
        transition_document = Transition_Documents(
            Source_Store_ID = source_store,
            Destination_Store_ID = destination_store
        )
        transition_document.save(using=DBName)
        for Order in Orders:
            transition_item = Transition_Items(
                Document_ID = transition_document,
                Product_ID = Order['ProductID'],
                Quantity = Order['Quantity']
            )
            transition_item.save(using=DBName)
        connections[DBName].commit()
        return {"StatusCode": 0,"Data": "OK"}
    
    @staticmethod
    def SearchProducts(DBName, RequestList: dict):
        FilterArguments = {"Store_ID": RequestList["StoreID"]}
        del RequestList["RequestType"]
        del RequestList["ProjectID"]
        del RequestList["StoreID"]
        FilterArguments = FilterArguments | {f+"__contains": RequestList[f] for f in RequestList.keys()}
        products_list = Product_Quantity_Table.objects.using(DBName).select_related('Product_ID').filter(**FilterArguments).values(
            'Product_ID__Product_ID', 'Product_ID__Product_Name', 'Product_ID__Trademark',
            'Product_ID__Manufacture_Country', 'Product_ID__Quantity_Unit', 'Product_ID__Purchase_Price',
            'Product_ID__Wholesale_Price', 'Product_ID__Retail_Price', 'Quantity'
        )
        return {"StatusCode":0,"Data":list(products_list)}
    
    @staticmethod
    def SearchInvoices(DBName, RequestList):
        InvoiceType = RequestList["InvoiceType"]
        FilterArguments = {
            "Store_ID": RequestList["StoreID"],
            "DateTime__gte": RequestList["FromDateTime"],
            "DateTime__lte": RequestList["ToDateTime"]
        }
        del RequestList["RequestType"]
        del RequestList["ProjectID"]
        del RequestList["StoreID"]
        del RequestList["InvoiceType"]
        del RequestList["FromDateTime"]
        del RequestList["ToDateTime"]
        FilterArguments = FilterArguments | {f+"__contains": RequestList[f] for f in RequestList.keys()}
        match InvoiceType:
            case "Selling":
                invoices_list = Selling_Invoices.objects.using(DBName).filter(**FilterArguments).values()
            case "Purchase":
                invoices_list = Purchase_Invoices.objects.using(DBName).filter(**FilterArguments).values()
        
        
        return {"StatusCode":0,"Data":list(invoices_list)}
    
    @staticmethod
    def SearchTransitionDocuments(DBName, RequestList: dict):
        StoreID = RequestList["StoreID"]
        FilterArguments = {
            "DateTime__gte": RequestList["FromDateTime"],
            "DateTime__lte": RequestList["ToDateTime"]
        }
        del RequestList["RequestType"]
        del RequestList["ProjectID"]
        del RequestList["StoreID"]
        del RequestList["FromDateTime"]
        del RequestList["ToDateTime"]
        if "Source_Store_ID" in RequestList and "Destination_Store_ID" in RequestList:
            StoreFilter = Q(Source_Store_ID=RequestList["Source_Store_ID"]) | Q(Destination_Store_ID=RequestList["Destination_Store_ID"])
            del RequestList["Source_Store_ID"]
            del RequestList["Destination_Store_ID"]
        elif "Destination_Store_ID" in RequestList:
            StoreFilter = Q(Destination_Store_ID=RequestList["Destination_Store_ID"])
            del RequestList["Destination_Store_ID"]
        elif "Source_Store_ID" in RequestList:
            StoreFilter = Q(Source_Store_ID=RequestList["Source_Store_ID"])
            del RequestList["Source_Store_ID"]
        else:
            StoreFilter = Q()
        FilterArguments = FilterArguments | {f+"__contains": RequestList[f] for f in RequestList.keys()}
        documents_list = Transition_Documents.objects.using(DBName).filter((Q(Source_Store_ID=StoreID) | Q(Destination_Store_ID=StoreID)) & StoreFilter,**FilterArguments).select_related('Source_Store_ID', 'Destination_Store_ID').values(
            'Document_ID', 'DateTime',
            'Source_Store_ID__Store_ID', 'Source_Store_ID__Store_Name',
            'Destination_Store_ID__Store_ID', 'Destination_Store_ID__Store_Name'
        )
        return {"StatusCode":0,"Data":list(documents_list)}
    
    @staticmethod
    def GetInvoice(DBName, RequestList):
        InvoiceType = RequestList["InvoiceType"]
        InvoiceID = RequestList["InvoiceID"]
        if InvoiceType == "Selling":
            InvoiceInfo = Selling_Invoices.objects.using(DBName).select_related('Store_ID').filter(Invoice_ID=InvoiceID).values(
                'Invoice_ID', 'DateTime', 'Store_ID__Store_ID', 'Store_ID__Store_Name',
                'Client_Name', 'Total_Price', 'Paid', 'Transferred_To_Debt_Account'
            ).first()
            if (InvoiceInfo is None):
                return {"StatusCode":ErrorCodes.ValueNotFound,"Variable":"InvoiceID"}
            items = Selling_Items.objects.using(DBName).select_related('Product_ID').filter(Invoice_ID=InvoiceID).values(
                'Product_ID__Product_ID', 'Product_ID__Product_Name', 'Product_ID__Trademark',
                'Product_ID__Manufacture_Country', 'Product_ID__Quantity_Unit', 'Quantity', 'Unit_Price'
            )
        else:
            InvoiceInfo = Purchase_Invoices.objects.using(DBName).select_related('Store_ID').filter(Invoice_ID=InvoiceID).values(
                'Invoice_ID', 'DateTime', 'Store_ID__Store_ID', 'Store_ID__Store_Name',
                'Seller_Name', 'Total_Price', 'Paid', 'Deducted_From_Debt_Account'
            ).first()
            if (InvoiceInfo is None):
                return {"StatusCode":ErrorCodes.ValueNotFound,"Variable":"InvoiceID"}
            items = Purchase_Items.objects.using(DBName).select_related('Product_ID').filter(Invoice_ID=InvoiceID).values(
                'Product_ID__Product_ID', 'Product_ID__Product_Name', 'Product_ID__Trademark',
                'Product_ID__Manufacture_Country', 'Product_ID__Quantity_Unit', 'Quantity', 'Unit_Price'
            )

        InvoiceInfo["Items"] = list(items)
        return {"StatusCode":0,"Data":InvoiceInfo}
    
    @staticmethod
    def GetTransitionDocument(DBName, RequestList):
        DocumentID = RequestList["DocumentID"]
        DocumentInfo = Transition_Documents.objects.using(DBName).select_related('Source_Store_ID', 'Destination_Store_ID').filter(Document_ID=DocumentID).values(
            'Document_ID', 'DateTime',
            'Source_Store_ID__Store_ID', 'Source_Store_ID__Store_Name',
            'Destination_Store_ID__Store_ID', 'Destination_Store_ID__Store_Name'
        ).first()
        if not DocumentInfo:
            return {"StatusCode":ErrorCodes.ValueNotFound,"Variable":"DocumentID"}
        items = Transition_Items.objects.using(DBName).select_related('Product_ID').filter(Document_ID=DocumentID).values(
            'Product_ID__Product_ID', 'Product_ID__Product_Name', 'Product_ID__Trademark',
            'Product_ID__Manufacture_Country', 'Product_ID__Quantity_Unit', 'Quantity'
        )
        DocumentInfo["Items"] = list(items)
        return {"StatusCode":0,"Data":DocumentInfo}
    
    @staticmethod
    def AdjustProductQuantity(DBName, RequestList: dict, store):
        OperationType, ProductID, Quantity = (
            RequestList["OperationType"], RequestList["ProductID"], RequestList["Quantity"])
        match OperationType:
            case "MoreThanPurchaseInvoice" | "Fixed" | "Found":
                #Cursor.execute(f"UPDATE Product_Quantity_Table SET Quantity = Quantity + {Quantity} WHERE Store_ID={StoreID} AND Product_ID={ProductID};")
                Product_Quantity_Table.objects.using(DBName).filter(Store_ID=store, Product_ID=ProductID).update(Quantity=F('Quantity') + Quantity)
            case "LessThanPurchaseInvoice" | "Damaged" | "Lost":
                #Cursor.execute(f"SELECT Quantity FROM Product_Quantity_Table WHERE Store_ID={StoreID} AND Product_ID={ProductID};")
                product_quantity = Product_Quantity_Table.objects.using(DBName).get(Store_ID=store, Product_ID=ProductID)
                if product_quantity.Quantity < Decimal(Quantity):
                    return {"StatusCode":ErrorCodes.InsufficientQuantity,"ProductID":ProductID}
                Product_Quantity_Table.objects.using(DBName).filter(Store_ID=store, Product_ID=ProductID).update(Quantity=F('Quantity') - Quantity)
        #Cursor.execute(f"INSERT INTO Products_Quantities_Adjustments(Store_ID,Product_ID,Operation_Type,Quantity,Note) VALUES ('{StoreID}','{ProductID}','{OperationType}','{Quantity}','{Note}');")
        adjustment_operation = Products_Quantities_Adjustments(
            Store_ID = store,
            Product_ID = Products_Table.objects.using(DBName).get(Product_ID=ProductID),
            Operation_Type = OperationType,
            Quantity = Quantity,
            Note = RequestList.get("Note", "")
        )
        adjustment_operation.save(using=DBName)
        connections[DBName].commit()
        return {"StatusCode":0,"Data":"OK"}
    @staticmethod
    def SearchAdjustmentOperations(DBName, RequestList):
        StoreID = RequestList["StoreID"]
        FilterArguments = {
            "DateTime__gte": RequestList["FromDateTime"],
            "DateTime__lte": RequestList["ToDateTime"]
        }
        del RequestList["RequestType"]
        del RequestList["ProjectID"]
        del RequestList["StoreID"]
        del RequestList["FromDateTime"]
        del RequestList["ToDateTime"]
        FilterArguments = FilterArguments | {f+"__contains": RequestList[f] for f in RequestList.keys()}
        adjustments_list = Products_Quantities_Adjustments.objects.using(DBName).select_related('Product_ID').filter(Store_ID=StoreID, **FilterArguments).values(
            'Operation_ID', 'DateTime', 'Product_ID__Product_ID', 'Product_ID__Product_Name',
            'Product_ID__Trademark', 'Product_ID__Manufacture_Country', 'Product_ID__Quantity_Unit',
            'Operation_Type', 'Quantity', 'Note'
        )
        return {"StatusCode":0,"Data":list(adjustments_list)}

        
    
class SearchFiltersValidation:
    @staticmethod
    def SellingInvoices(RequestList):
        for Filter in RequestList.keys():
            match Filter:
                case "Invoice_ID":
                    if not isintstr(RequestList[Filter]): return {"StatusCode":ErrorCodes.InvalidDataType,"Data":""}
                case "Total_Price":
                    if not isintstr(RequestList[Filter]): return {"StatusCode":ErrorCodes.InvalidDataType,"Data":""}
                case "Paid":
                    if not isintstr(RequestList[Filter]): return {"StatusCode":ErrorCodes.InvalidDataType,"Data":""}
                case "Transferred_To_Debt_Account":
                    if not isintstr(RequestList[Filter]): return {"StatusCode":ErrorCodes.InvalidDataType,"Data":""}
                case "Product_ID":
                    if not isintstr(RequestList[Filter]): return {"StatusCode":ErrorCodes.InvalidDataType,"Data":""}
                case "Product_Name" | "Client_Name":
                    pass
                case "Quantity":
                    if not isintstr(RequestList[Filter]): return {"StatusCode":ErrorCodes.InvalidDataType,"Data":""}
                case "Selling_Price":
                    if not isintstr(RequestList[Filter]): return {"StatusCode":ErrorCodes.InvalidDataType,"Data":""}
                case "RequestType" | "InvoiceType" | "ProjectID" | "StoreID"| "FromDateTime"| "ToDateTime":
                    pass
                case _:
                    return {"StatusCode":ErrorCodes.InvalidValue,"Filter":Filter}
        return 0
    
    @staticmethod
    def PurchaseInvoices(RequestList):
        for Filter in RequestList.keys():
            match Filter:
                case "Invoice_ID":
                    if not isintstr(RequestList[Filter]): return {"StatusCode":ErrorCodes.InvalidDataType,"Data":""}
                case "Total_Price":
                    if not isintstr(RequestList[Filter]): return {"StatusCode":ErrorCodes.InvalidDataType,"Data":""}
                case "Paid":
                    if not isintstr(RequestList[Filter]): return {"StatusCode":ErrorCodes.InvalidDataType,"Data":""}
                case "Deducted_From_Debt_Account":
                    if not isintstr(RequestList[Filter]): return {"StatusCode":ErrorCodes.InvalidDataType,"Data":""}
                case "Product_ID":
                    if not isintstr(RequestList[Filter]): return {"StatusCode":ErrorCodes.InvalidDataType,"Data":""}
                case "Product_Name" | "Seller_Name":
                    pass
                case "Quantity":
                    if not isintstr(RequestList[Filter]): return {"StatusCode":ErrorCodes.InvalidDataType,"Data":""}
                case "Purchase_Price":
                    if not isintstr(RequestList[Filter]): return {"StatusCode":ErrorCodes.InvalidDataType,"Data":""}
                case "RequestType" | "InvoiceType" | "ProjectID" | "StoreID"| "FromDateTime"| "ToDateTime":
                    pass
                case _:
                    return {"StatusCode":ErrorCodes.InvalidValue,"Filter":Filter}
        return 0
    
def GetOrders(DBName, RequestList: dict):
    i = 0
    Orders = []
    OrdersIDs = []
    TotalPrice = Decimal()
    while True:
        if i > PURCHASE_INVOICE_LENGTH:
            return {"StatusCode": ErrorCodes.ExceededMaximum, "Variable": "Orders"} , 0
        Order = {}
        if (Para := RequestList.get(f"Orders[{i}][ProductID]")) is not None:
            if not isintstr(Para):
                return {"StatusCode":ErrorCodes.InvalidDataType,"Variable":f"Orders[{i}][ProductID]"}, 0
            if not Products_Table.objects.using(DBName).filter(Product_ID=Para).exists():
                return {"StatusCode":ErrorCodes.NonexistentProduct,"Variable":f"Orders[{i}][ProductID]"}, 0
            Order["ProductID"] = Para
        if (Para := RequestList.get(f"Orders[{i}][Quantity]")) is not None:
            if not isnumberstr(Para):
                return {"StatusCode":ErrorCodes.InvalidDataType,"Variable":f"Orders[{i}][Quantity]"}, 0
            if float(Para) <= 0:
                return {"StatusCode":ErrorCodes.InvalidValue,"Variable":f"Orders[{i}][Quantity]"}, 0
            Order["Quantity"] = Decimal(Para)
        if (Para := RequestList.get(f"Orders[{i}][UnitPrice]")) is not None:
            if not isnumberstr(Para):
                return {"StatusCode":ErrorCodes.InvalidDataType,"Variable":f"Orders[{i}][UnitPrice]"}, 0
            if float(Para) < 0:
                return {"StatusCode":ErrorCodes.InvalidValue,"Variable":f"Orders[{i}][UnitPrice]"}, 0
            Order["UnitPrice"] = float(Para)
        if not Order:
            break
        elif len(Order.keys()) < 3:
            return {"StatusCode":ErrorCodes.MissingVariables,"Variable":f"Orders[{i}]"}, 0
        TotalPrice += Decimal(Order["UnitPrice"]) * Decimal(Order["Quantity"])
        
        if not Order["ProductID"] in OrdersIDs:
            Orders.append(Order)
            OrdersIDs.append(Order["ProductID"])
        else:
            return {"StatusCode":ErrorCodes.RedundantValue,"Variable":f"Orders[{i}]"}, 0
        i += 1
    return Orders, TotalPrice

def getTransitionOrders(DBName, RequestList: dict):
    i = 0
    Products = []
    while True:
        if i > TRANSITION_DOCUMENT_LENGTH:
            return {"StatusCode": ErrorCodes.ExceededMaximum, "Variable": "Products"}
        Order = {}
        if (Para := RequestList.get(f"Orders[{i}][ProductID]")) is not None:
            if not isintstr(Para):
                return {"StatusCode":ErrorCodes.InvalidDataType,"Variable":f"Products[{i}][ProductID]"}
            Order["ProductID"] = Para
        if (Para := RequestList.get(f"Orders[{i}][Quantity]")) is not None:
            if not isintstr(Para):
                return {"StatusCode":ErrorCodes.InvalidDataType,"Variable":f"Products[{i}][Quantity]"}
            if float(Para) <= 0:
                return {"StatusCode":ErrorCodes.InvalidValue,"Variable":f"Products[{i}][Quantity]"}
            Order["Quantity"] = Decimal(Para)
        if not Order:
            break
        elif len(Order.keys()) < 2:
            return {"StatusCode":ErrorCodes.MissingVariables,"Variable":f"Products[{i}]"}
        if not Products_Table.objects.using(DBName).filter(Product_ID=Order["ProductID"]).exists():
            return {"StatusCode":ErrorCodes.NonexistentProduct,"Variable":f"Orders[{i}][ProductID]"}
        Products.append(Order)
        i += 1
    return Products
ValidHistoryTables = ["Selling_Invoices","Purchase_Invoices","Transition_Documents","Accounts_Operations"]
ValidInvoiceTypes = ["Selling","Purchase"]
class CheckValidation:
    @staticmethod
    def CreateProject(RequestList):
        try:
            ProjectName, ProjectDescription = RequestList["ProjectName"], RequestList["ProjectDescription"]
        except:
            return {"StatusCode":ErrorCodes.MissingVariables,"Data":""}
        if len(ProjectName) == 0: return {"StatusCode":ErrorCodes.EmptyValue,"Variable":"ProjectName"}
        if len(ProjectDescription) == 0: return {"StatusCode":ErrorCodes.EmptyValue,"Variable":"ProjectDescription"}
        return ProcessRequest.CreateProject(RequestList)

    @staticmethod
    def CreateAccount(RequestList):
        try:
            ProjectID, PersonName = RequestList["ProjectID"], RequestList["PersonName"]
        except:
            return {"StatusCode":ErrorCodes.MissingVariables,"Data":""}
        if ProjectsDBsConnectors.get(int(ProjectID)) is None: return {"StatusCode":ErrorCodes.ValueNotFound,"Data":""}
        if len(PersonName) == 0: return {"StatusCode":ErrorCodes.EmptyValue,"Variable": "PersonName"}
        if Debt_Accounts.objects.using(f"Project{ProjectID}").filter(Person_Name=PersonName).exists():
            return {"StatusCode":ErrorCodes.RedundantValue,"Variable":"PersonName"}
        return ProcessRequest.CreateAccount(f"Project{ProjectID}", RequestList)
    
    @staticmethod
    def AddStore(RequestList):
        try:
            ProjectID, StoreName = RequestList["ProjectID"], RequestList["StoreName"]
        except:
            return {"StatusCode":ErrorCodes.MissingVariables,"Data":""}
        if not isintstr(ProjectID): return {"StatusCode":ErrorCodes.InvalidDataType,"Data":""}

        if ProjectsDBsConnectors.get(int(ProjectID)) is None: return {"StatusCode":ErrorCodes.ValueNotFound,"Data":""}
        
        if len(StoreName) == 0:return {"StatusCode":ErrorCodes.EmptyValue,"Variable":"StoreName"}
        return ProcessRequest.AddStore(f"Project{ProjectID}", RequestList)
    
    @staticmethod
    def GetStores(RequestList):
        try:
            ProjectID = RequestList["ProjectID"]
        except:
            return {"StatusCode":ErrorCodes.MissingVariables,"Data":""}
        if not isintstr(ProjectID): return {"StatusCode":ErrorCodes.InvalidDataType,"Data":""}
        ProjectID = int(ProjectID)
        if ProjectsDBsConnectors.get(ProjectID) is None: return {"StatusCode":ErrorCodes.ValueNotFound,"Data":""}
        return ProcessRequest.GetStores(f"Project{ProjectID}")
    
    @staticmethod
    def AddProduct(RequestList):
        try:
            ProjectID = RequestList["ProjectID"]
        except:
            return {"StatusCode":ErrorCodes.MissingVariables,"Data":""}
        if not isintstr(ProjectID): return {"StatusCode":ErrorCodes.InvalidDataType, "Variable":"ProjectID"}
        if ProjectsDBsConnectors.get(int(ProjectID)) is None: return {"StatusCode":ErrorCodes.ValueNotFound,"Data":""}
        if Stores_Table.objects.using(f"Project{ProjectID}").count() == 0:
            return {"StatusCode":ErrorCodes.NoStoresExist,"Data":""}
        try:
            ProductName, Trademark, ManufactureCountry, PurchasePrice, WholesalePrice, RetailPrice, QuantityUnit =(
                RequestList["ProductName"], RequestList["Trademark"], RequestList["ManufactureCountry"],
                RequestList["PurchasePrice"],RequestList["WholesalePrice"], RequestList["RetailPrice"],
                RequestList["QuantityUnit"]
            )
        except:
            return {"StatusCode":ErrorCodes.MissingVariables,"Data":""}
        if RequestList.get("ProductOrder") is not None and not isintstr(RequestList["ProductOrder"]):
            return {"StatusCode":ErrorCodes.InvalidDataType,"Variable":"ProductOrder"}
        if not isnumberstr(PurchasePrice):return {"StatusCode":ErrorCodes.InvalidDataType,"Data":""}
        if not isnumberstr(WholesalePrice):return {"StatusCode":ErrorCodes.InvalidDataType,"Data":""}
        if not isnumberstr(RetailPrice):return {"StatusCode":ErrorCodes.InvalidDataType,"Data":""}
        if len(ProductName) == 0: return {"StatusCode":ErrorCodes.EmptyValue,"Variable": "ProductName"}
        if len(Trademark) == 0:return {"StatusCode":ErrorCodes.EmptyValue,"Variable":"Trademark"}
        if len(ManufactureCountry) == 0:return {"StatusCode":ErrorCodes.EmptyValue,"Variable":"ManufactureCountry"}
        if len(QuantityUnit) == 0:return {"StatusCode":ErrorCodes.EmptyValue,"Variable":"QuantityUnit"}
        if float(PurchasePrice) < 0: return {"StatusCode":ErrorCodes.InvalidValue,"Data":""}
        if float(WholesalePrice) < 0:return {"StatusCode":ErrorCodes.InvalidValue,"Data":""}
        if float(RetailPrice) < 0:return {"StatusCode":ErrorCodes.InvalidValue,"Data":""}
        return ProcessRequest.AddProduct(f"Project{ProjectID}", RequestList)
    
    @staticmethod
    def EditProductInfo(RequestList):
        try:
            ProjectID, ProductID, ProductName, Trademark, ManufactureCountry, PurchasePrice, WholesalePrice, RetailPrice, QuantityUnit = (
                RequestList["ProjectID"], RequestList["ProductID"], RequestList["ProductName"], RequestList["Trademark"],
                RequestList["ManufactureCountry"], RequestList["PurchasePrice"], RequestList["WholesalePrice"],
                RequestList["RetailPrice"], RequestList["QuantityUnit"]
            )
        except:
            return {"StatusCode":ErrorCodes.MissingVariables,"Data":""}
        if not isintstr(ProjectID): return {"StatusCode":ErrorCodes.InvalidDataType,"Variable":"ProjectID"}
        if ProjectsDBsConnectors.get(int(ProjectID)) is None:
            return {"StatusCode":ErrorCodes.ValueNotFound,"Data":""}
        # TODO: Add ability to edit ProductOrder
        if not isintstr(ProductID): return {"StatusCode":ErrorCodes.InvalidDataType,"Data":""}
        is_product_exists = Products_Table.objects.using(f"Project{ProjectID}").filter(Product_ID=ProductID).exists()
        if not is_product_exists:
            return {"StatusCode":ErrorCodes.NonexistentProduct,"Variable":"ProductID"}
        if not isnumberstr(PurchasePrice): return {"StatusCode":ErrorCodes.InvalidDataType,"Data":""}
        if not isnumberstr(WholesalePrice): return {"StatusCode":ErrorCodes.InvalidDataType,"Data":""}
        if not isnumberstr(RetailPrice): return {"StatusCode":ErrorCodes.InvalidDataType,"Data":""}
        if len(ProductName) == 0: return {"StatusCode":ErrorCodes.EmptyValue,"Variable":"ProductName"}
        if len(Trademark) == 0: return {"StatusCode":ErrorCodes.EmptyValue,"Variable": "Trademark"}
        if len(ManufactureCountry) == 0: return {"StatusCode":ErrorCodes.EmptyValue,"Variable": "ManufactureCountry"}
        if float(PurchasePrice) < 0: return {"StatusCode":ErrorCodes.InvalidValue,"Data":""}
        if float(WholesalePrice) < 0: return {"StatusCode":ErrorCodes.InvalidValue,"Data":""}
        if float(RetailPrice) < 0: return {"StatusCode":ErrorCodes.InvalidValue,"Data":""}
        if len(QuantityUnit) == 0: return {"StatusCode":ErrorCodes.EmptyValue,"Variable":"QuantityUnit"}
        return ProcessRequest.EditProductInfo(f"Project{ProjectID}", RequestList)
    
    @staticmethod
    def GetProductInfo(RequestList):
        try:
            ProjectID, ProductID = RequestList["ProjectID"], RequestList["ProductID"]
        except:
            return {"StatusCode":ErrorCodes.MissingVariables,"Data":""}
        if not isintstr(ProjectID): return {"StatusCode":ErrorCodes.InvalidDataType,"Variable":"ProjectID"}
        if ProjectsDBsConnectors.get(int(ProjectID)) is None:
            return {"StatusCode":ErrorCodes.ValueNotFound,"Variable":"ProjectID"}
        if not isintstr(ProductID): return {"StatusCode":ErrorCodes.InvalidDataType,"Data":""}
        is_product_exists = Products_Table.objects.using(f"Project{ProjectID}").filter(Product_ID=ProductID).exists()
        if not is_product_exists:
            return {"StatusCode":ErrorCodes.NonexistentProduct,"Variable":"ProductID"}
        return ProcessRequest.GetProductInfo(f"Project{ProjectID}", RequestList)

    @staticmethod
    def GetProductsQuantities(RequestList):
        try:
            ProjectID, StoreID = RequestList["ProjectID"], RequestList["StoreID"]
        except:
            return {"StatusCode":ErrorCodes.MissingVariables,"Data":""}
        i = 0
        ProductsIDs = []
        while True:
            if (ProductID := RequestList.get(f"ProductsIDs[{i}]")) is None: break
            if not isintstr(ProductID): return {"StatusCode":ErrorCodes.InvalidDataType,"Variable":f"ProductsIDs[{i}]"}
            ProductsIDs.append(ProductID)
            i+=1
        if len(ProductsIDs) == 0: return {"StatusCode":ErrorCodes.MissingVariables,"Variable":"ProductsIDs"}
        if not isintstr(ProjectID): return {"StatusCode":ErrorCodes.InvalidDataType,"Data":""}
        if ProjectsDBsConnectors.get(int(ProjectID)) is None: return {"StatusCode":ErrorCodes.ValueNotFound,"Data":""}
        if not isintstr(StoreID): return {"StatusCode":ErrorCodes.InvalidDataType,"Data":""}
        store = Stores_Table.objects.using(f"Project{ProjectID}").get(Store_ID=StoreID)
        if store is None:
            return {"StatusCode":ErrorCodes.ValueNotFound,"Variable":"StoreID"}
        return ProcessRequest.GetProductsQuantities(f"Project{ProjectID}", RequestList, ProductsIDs, store)    
    
    @staticmethod
    def Sell(RequestList):
        try:
            ProjectID, StoreID, ClientName, Paid = (
                RequestList["ProjectID"],RequestList["StoreID"], RequestList["ClientName"], RequestList["Paid"])
        except:
            return {"StatusCode":ErrorCodes.MissingVariables,"Data":""}
        if not isintstr(ProjectID): return {"StatusCode":ErrorCodes.InvalidDataType,"Data":""}
        
        if ProjectsDBsConnectors.get(int(ProjectID)) is None: return {"StatusCode":ErrorCodes.ValueNotFound,"Data":""}
        if not isintstr(StoreID): return {"StatusCode":ErrorCodes.InvalidDataType,"Data":""}
        if len(ClientName) == 0: return {"StatusCode":ErrorCodes.EmptyValue,"Variable":"ClientName"}
        if not isnumberstr(Paid): return {"StatusCode":ErrorCodes.InvalidDataType,"Data":""}
        RequestList["Paid"] = Decimal(Paid)
        if RequestList["Paid"] < 0: return {"StatusCode":ErrorCodes.InvalidValue,"Data":""}
        store = Stores_Table.objects.using(f"Project{ProjectID}").get(Store_ID=StoreID)
        if store is None:
            return {"StatusCode":ErrorCodes.ValueNotFound,"Variable":"StoreID"}
        Orders, RequiredAmount = GetOrders(f"Project{ProjectID}", RequestList)
        if isinstance(Orders, dict):
            return Orders
        if len(Orders) == 0:
            return {"StatusCode":ErrorCodes.MissingVariables,"Variable":"Orders"}
        if RequestList["Paid"] > RequiredAmount:
            return {"StatusCode":ErrorCodes.InvalidValue,"Variable":"Paid"}
        return ProcessRequest.Sell(f"Project{ProjectID}", RequestList, Orders, RequiredAmount, store)
    
    @staticmethod
    def Purchase(RequestList):
        try:
            ProjectID, StoreID, SellerName, Paid = (
                RequestList["ProjectID"], RequestList["StoreID"], RequestList["SellerName"], RequestList["Paid"])
        except:
            return {"StatusCode":ErrorCodes.MissingVariables, "Data":""}
        if not isintstr(ProjectID): return {"StatusCode":ErrorCodes.InvalidDataType,"Data":""}
        if ProjectsDBsConnectors.get(int(ProjectID)) is None: return {"StatusCode":ErrorCodes.ValueNotFound,"Data":""}
        if not isintstr(StoreID): return {"StatusCode":ErrorCodes.InvalidDataType,"Data":""}
        if len(SellerName) == 0: return {"StatusCode": ErrorCodes.EmptyValue, "Variable": "SellerName"}
        if not isnumberstr(Paid): return {"StatusCode":ErrorCodes.InvalidDataType,"Variable":"Paid"}
        RequestList["Paid"] = Decimal(Paid)
        if RequestList["Paid"] < 0: return {"StatusCode":ErrorCodes.InvalidValue,"Variable":"Paid"}
        store = Stores_Table.objects.using(f"Project{ProjectID}").get(Store_ID=StoreID)
        if store is None:
            return {"StatusCode":ErrorCodes.ValueNotFound,"Variable":"StoreID"}
        Orders, TotalPrice = GetOrders(f"Project{ProjectID}", RequestList)
        if isinstance(Orders, dict):
            return Orders
        if len(Orders) == 0:
            return {"StatusCode":ErrorCodes.MissingVariables,"Variable":"Orders"}
        if RequestList["Paid"] > TotalPrice:
            return {"StatusCode":ErrorCodes.InvalidValue,"Variable":"Paid"}
        return ProcessRequest.Purchase(f"Project{ProjectID}", RequestList, Orders, TotalPrice, store)
    
    @staticmethod
    def EditSellingInvoice(RequestList):
        try:
            ProjectID, InvoiceID, ClientName, Paid = (
                RequestList["ProjectID"], RequestList["InvoiceID"], RequestList["ClientName"], RequestList["Paid"])
        except:
            return {"StatusCode":ErrorCodes.MissingVariables,"Data":""}
        if not isintstr(ProjectID): return {"StatusCode":ErrorCodes.InvalidDataType,"Data":""}
        if ProjectsDBsConnectors.get(int(ProjectID)) is None: return {"StatusCode":ErrorCodes.ValueNotFound,"Data":""}
        if not isintstr(InvoiceID): return {"StatusCode":ErrorCodes.InvalidDataType,"Data":""}
        if not isnumberstr(Paid): return {"StatusCode":ErrorCodes.InvalidDataType,"Data":""}
        if float(Paid) < 0: return {"StatusCode":ErrorCodes.InvalidValue,"Data":""}
        if len(ClientName) == 0: return {"StatusCode":ErrorCodes.EmptyValue,"Variable":"ClientName"}
        selling_invoice = Selling_Invoices.objects.using(f"Project{ProjectID}").filter(Invoice_ID=InvoiceID).first()
        if selling_invoice is None:
            return {"StatusCode":ErrorCodes.ValueNotFound,"Variable":"InvoiceID"}
        Orders, TotalPrice = GetOrders(f"Project{ProjectID}", RequestList)
        if isinstance(Orders, dict):
            return Orders
        if len(Orders) == 0:
            return {"StatusCode":ErrorCodes.MissingVariables,"Variable":"Orders"}
        RequestList["Paid"] = Decimal(Paid)
        if RequestList["Paid"] > TotalPrice:
            return {"StatusCode":ErrorCodes.InvalidValue,"Variable":"Paid"}
        return ProcessRequest.EditSellingInvoice(f"Project{ProjectID}", selling_invoice, RequestList, Orders, TotalPrice)
    
    @staticmethod
    def EditPurchaseInvoice(RequestList):
        try:
            ProjectID, InvoiceID, SellerName, Paid = (
                RequestList["ProjectID"], RequestList["InvoiceID"], RequestList["SellerName"], RequestList["Paid"])
        except:
            return {"StatusCode":ErrorCodes.MissingVariables,"Data":""}
        if not isintstr(ProjectID): return {"StatusCode":ErrorCodes.InvalidDataType,"Data":""}
        if ProjectsDBsConnectors.get(int(ProjectID)) is None: return {"StatusCode":ErrorCodes.ValueNotFound,"Data":""}
        if not isintstr(InvoiceID): return {"StatusCode":ErrorCodes.InvalidDataType,"Data":""}
        if not isnumberstr(Paid): return {"StatusCode":ErrorCodes.InvalidDataType,"Data":""}
        if len(SellerName) == 0: return {"StatusCode":ErrorCodes.EmptyValue,"Variable":"SellerName"}
        if float(Paid) < 0: return {"StatusCode":ErrorCodes.InvalidValue,"Data":""}
        purchase_invoice = Purchase_Invoices.objects.using(f"Project{ProjectID}").filter(Invoice_ID=InvoiceID).first()
        if purchase_invoice is None:
            return {"StatusCode":ErrorCodes.ValueNotFound,"Variable":"InvoiceID"}

        Orders, TotalPrice = GetOrders(f"Project{ProjectID}", RequestList)
        if isinstance(Orders, dict):
            return Orders
        if len(Orders) == 0:
            return {"StatusCode":ErrorCodes.MissingVariables,"Variable":"Orders"}
        RequestList["Paid"] = Decimal(Paid)
        if RequestList["Paid"] > TotalPrice:
            return {"StatusCode":ErrorCodes.InvalidValue,"Variable": "Paid"}
        return ProcessRequest.EditPurchaseInvoice(f"Project{ProjectID}", purchase_invoice, RequestList, Orders, TotalPrice)
    
    @staticmethod
    def EditTransitionDocument(RequestList):
        try:
            ProjectID, DocumentID, DestinationStoreID = (RequestList["ProjectID"],
                RequestList["DocumentID"], RequestList["DestinationStoreID"])
        except:
            return {"StatusCode":ErrorCodes.MissingVariables,"Data":""}
        if ProjectsDBsConnectors.get(int(ProjectID)) is None: return {"StatusCode":ErrorCodes.ValueNotFound,"Variable": "ProjectID"}

        if not isintstr(DestinationStoreID): return {"StatusCode":ErrorCodes.InvalidDataType,"Data":""}
        transition_document = Transition_Documents.objects.using(f"Project{ProjectID}").filter(Document_ID=DocumentID).first()
        if transition_document is None:
            return {"StatusCode": ErrorCodes.ValueNotFound, "Variable": "DocumentID"}
        destination_store = Stores_Table.objects.using(f"Project{ProjectID}").get(Store_ID=DestinationStoreID)
        if destination_store is None:
            return {"StatusCode": ErrorCodes.ValueNotFound, "Variable": "DestinationStoreID"}
        Orders = getTransitionOrders(f"Project{ProjectID}", RequestList)
        if isinstance(Orders, dict):
            return Orders
        if len(Orders) == 0:
            return {"StatusCode": ErrorCodes.MissingVariables, "Variable": "Products"}
        return ProcessRequest.EditTransitionDocument(f"Project{ProjectID}", transition_document, destination_store, RequestList, Orders)
    
    @staticmethod
    def DeletePurchaseInvoice(RequestList):
        try:
            ProjectID, InvoiceID = RequestList["ProjectID"], RequestList["InvoiceID"]
        except:
            return {"StatusCode":ErrorCodes.MissingVariables,"Data":""}
        if not isintstr(ProjectID): return {"StatusCode":ErrorCodes.InvalidDataType,"Data":""}
        if ProjectsDBsConnectors.get(int(ProjectID)) is None: return {"StatusCode":ErrorCodes.ValueNotFound,"Data":""}
        if not isintstr(InvoiceID): return {"StatusCode":ErrorCodes.InvalidDataType,"Data":""}
        purchase_invoice = Purchase_Invoices.objects.using(f"Project{ProjectID}").filter(Invoice_ID=InvoiceID).first()
        if purchase_invoice is None:
            return {"StatusCode":ErrorCodes.ValueNotFound,"Variable":"InvoiceID"}
        return ProcessRequest.DeletePurchaseInvoice(f"Project{ProjectID}", purchase_invoice)
    
    @staticmethod
    def DeleteSellingInvoice(RequestList):
        try:
            ProjectID, InvoiceID = RequestList["ProjectID"], RequestList["InvoiceID"]
        except:
            return {"StatusCode":ErrorCodes.MissingVariables,"Data":""}
        if not isintstr(ProjectID): return {"StatusCode":ErrorCodes.InvalidDataType,"Data":""}
        if ProjectsDBsConnectors.get(int(ProjectID)) is None: return {"StatusCode":ErrorCodes.ValueNotFound,"Data":""}
        if not isintstr(InvoiceID): return {"StatusCode":ErrorCodes.InvalidDataType,"Data":""}
        selling_invoice = Selling_Invoices.objects.using(f"Project{ProjectID}").filter(Invoice_ID=InvoiceID).first()
        if selling_invoice is None:
            return {"StatusCode":ErrorCodes.ValueNotFound,"Variable":"InvoiceID"}
        return ProcessRequest.DeleteSellingInvoice(f"Project{ProjectID}", selling_invoice)

    @staticmethod
    def DeleteTransitionDocument(RequestList):
        try:
            ProjectID, DocumentID = RequestList["ProjectID"], RequestList["DocumentID"]
        except:
            return {"StatusCode":ErrorCodes.MissingVariables,"Data":""}
        if not isintstr(ProjectID): return {"StatusCode":ErrorCodes.InvalidDataType,"Data":""}
        if ProjectsDBsConnectors.get(int(ProjectID)) is None: return {"StatusCode":ErrorCodes.ValueNotFound,"Data":""}
        if not isintstr(DocumentID): return {"StatusCode":ErrorCodes.InvalidDataType,"Data":""}
        transition_document = Transition_Documents.objects.using(f"Project{ProjectID}").filter(Document_ID=DocumentID).first()
        if transition_document is None:
            return {"StatusCode":ErrorCodes.ValueNotFound,"Variable":"DocumentID"}
        return ProcessRequest.DeleteTransitionDocument(f"Project{ProjectID}", transition_document)
    
    @staticmethod
    def DeleteAdjustmentOperation(RequestList):
        try:
            ProjectID, OperationID = RequestList["ProjectID"], RequestList["OperationID"]
        except:
            return {"StatusCode":ErrorCodes.MissingVariables,"Data":""}
        if not isintstr(ProjectID): return {"StatusCode":ErrorCodes.InvalidDataType,"Data":""}
        if ProjectsDBsConnectors.get(int(ProjectID)) is None: return {"StatusCode":ErrorCodes.ValueNotFound,"Data":""}
        if not isintstr(OperationID): return {"StatusCode":ErrorCodes.InvalidDataType,"Data":""}
        adjustment_operation = Products_Quantities_Adjustments.objects.using(f"Project{ProjectID}").filter(Operation_ID=OperationID).first()
        if adjustment_operation is None:
            return {"StatusCode":ErrorCodes.ValueNotFound,"Variable":"OperationID"}
        return ProcessRequest.DeleteAdjustmentOperation(f"Project{ProjectID}", adjustment_operation)
    
    @staticmethod
    def AddToAccount(RequestList):
        try:
            ProjectID, PersonID, Description, Amount = (
                RequestList["ProjectID"], RequestList["PersonID"], RequestList["Description"], RequestList["Amount"])
        except:
            return {"StatusCode":ErrorCodes.MissingVariables,"Data":""}
        if ProjectID not in ProjectsDBsConnectors.keys(): return {"StatusCode":ErrorCodes.ValueNotFound,"Data":""}
        if not isintstr(PersonID): return {"StatusCode":ErrorCodes.InvalidDataType,"Data":""}
        
        if not isintstr(Amount): return {"StatusCode":ErrorCodes.InvalidDataType,"Data":""}
        if PersonID<0: return {"StatusCode":ErrorCodes.InvalidValue,"Data":""}
        if len(Description)==0: return {"StatusCode":ErrorCodes.InvalidValue,"Data":""}
        if Amount<=0: return {"StatusCode":ErrorCodes.InvalidValue,"Data":""}
        global Cursor
        global ProjectDBConnector
        ProjectDBConnector = ProjectsDBsConnectors[ProjectID]
        Cursor = ProjectDBConnector.cursor(dictionary=True, buffered=True)
        return ProcessRequest.AddToAccount(RequestList)
    
    @staticmethod
    def DeductFromAccount(RequestList):
        try:
            ProjectID, PersonID, Description, Amount = (
                RequestList["ProjectID"], RequestList["PersonID"], RequestList["Description"], RequestList["Amount"])
        except:
            return {"StatusCode":ErrorCodes.MissingVariables,"Data":""}
        if ProjectID not in ProjectsDBsConnectors.keys(): return {"StatusCode":ErrorCodes.ValueNotFound,"Data":""}
        if not isintstr(PersonID): return {"StatusCode":ErrorCodes.InvalidDataType,"Data":""}
        
        if not isintstr(Amount): return {"StatusCode":ErrorCodes.InvalidDataType,"Data":""}
        if len(Description)==0: return {"StatusCode":ErrorCodes.InvalidValue,"Data":""}
        if Amount <= 0: return {"StatusCode":ErrorCodes.InvalidValue,"Data":""}
        global Cursor
        global ProjectDBConnector
        ProjectDBConnector = ProjectsDBsConnectors[ProjectID]
        Cursor = ProjectDBConnector.cursor(dictionary=True, buffered=True)
        return ProcessRequest.DeductFromAccount(RequestList)
    
    @staticmethod
    def Transit(RequestList):
        try:
            ProjectID, SourceStoreID, DestinationStoreID = (RequestList["ProjectID"],
                RequestList["SourceStoreID"], RequestList["DestinationStoreID"])
        except:
            return {"StatusCode":ErrorCodes.MissingVariables,"Data":""}
        if ProjectsDBsConnectors.get(int(ProjectID)) is None: return {"StatusCode":ErrorCodes.ValueNotFound,"Variable": "ProjectID"}
        if SourceStoreID == DestinationStoreID:
            return {"StatusCode": ErrorCodes.InvalidValue,"Variable": "StoresIDs"}
        if not isintstr(SourceStoreID): return {"StatusCode":ErrorCodes.InvalidDataType,"Data":""}
        if not isintstr(DestinationStoreID): return {"StatusCode":ErrorCodes.InvalidDataType,"Data":""}
        
        source_store = Stores_Table.objects.using(f"Project{ProjectID}").get(Store_ID=SourceStoreID)
        if source_store is None:
            return {"StatusCode": ErrorCodes.ValueNotFound, "Variable": "SourceStoreID"}
        destination_store = Stores_Table.objects.using(f"Project{ProjectID}").get(Store_ID=DestinationStoreID)
        if destination_store is None:
            return {"StatusCode": ErrorCodes.ValueNotFound, "Variable": "DestinationStoreID"}
        Orders = getTransitionOrders(f"Project{ProjectID}", RequestList)
        if isinstance(Orders, dict):
            return Orders
        if len(Orders) == 0:
            return {"StatusCode": ErrorCodes.MissingVariables, "Variable": "Products"}
        return ProcessRequest.Transit(f"Project{ProjectID}", Orders, source_store, destination_store)
    
    @staticmethod
    def SearchProducts(RequestList):
        try:
            ProjectID, StoreID = RequestList["ProjectID"], RequestList["StoreID"]
        except:
            return {"StatusCode": ErrorCodes.MissingVariables, "Data": ""}
        if not isintstr(ProjectID): return {"StatusCode": ErrorCodes.InvalidDataType, "Variable": "ProjectID"}
        if ProjectsDBsConnectors.get(int(ProjectID)) is None:
            return {"StatusCode": ErrorCodes.ValueNotFound, "Variable": "ProjectID"}
        if not isintstr(StoreID): return {"StatusCode": ErrorCodes.InvalidDataType, "Variable": "StoreID"}
        for Filter in RequestList.keys():
            match Filter:
                case "Product_ID__Product_ID" | "Product_ID__Product_Name" | "Product_ID__Trademark" | "Product_ID__Manufacture_Country":
                    pass
                case "Product_ID__Purchase_Price" | "Product_ID__Wholesale_Price" | "Product_ID__Retail_Price":
                    if not isnumberstr(RequestList[Filter]): return {"StatusCode":ErrorCodes.InvalidDataType,"Data":""}
                case "Quantity":
                    if not isnumberstr(RequestList[Filter]): return {"StatusCode":ErrorCodes.InvalidDataType,"Data":""}
                case "RequestType" | "ProjectID" | "StoreID":
                    pass
                case _:
                    return {"StatusCode":ErrorCodes.InvalidValue,"Variable":"Filter","Filter":Filter}

        return ProcessRequest.SearchProducts(f"Project{ProjectID}", RequestList)
    
    @staticmethod
    def SearchInvoices(RequestList):
        try:
            ProjectID, InvoiceType, StoreID, FromDateTime, ToDateTime = (RequestList["ProjectID"], RequestList["InvoiceType"],
                RequestList["StoreID"], RequestList["FromDateTime"], RequestList["ToDateTime"])
        except:
            return {"StatusCode":ErrorCodes.MissingVariables,"Data":""}
        if not isintstr(ProjectID): return {"StatusCode":ErrorCodes.InvalidDataType,"Data":""}
        try:
            datetime.strptime(FromDateTime,"%Y-%m-%dT%H:%M:%S")
        except:
            return {"StatusCode":ErrorCodes.InvalidValue,"Variable":"FromDateTime"}
        try:
            datetime.strptime(ToDateTime,"%Y-%m-%dT%H:%M:%S")
        except:
            return {"StatusCode":ErrorCodes.InvalidValue,"Variable":"ToDateTime"}
        if ProjectsDBsConnectors.get(int(ProjectID)) is None: return {"StatusCode":ErrorCodes.ValueNotFound,"Data":""}
        if not isintstr(StoreID): return {"StatusCode":ErrorCodes.InvalidDataType,"Data":""}
        store_exists = Stores_Table.objects.using(f"Project{ProjectID}").filter(Store_ID=StoreID).exists()
        if not store_exists:
            return {"StatusCode":ErrorCodes.ValueNotFound,"Variable":"StoreID"}
        match InvoiceType:
            case "Selling":
                Error = SearchFiltersValidation.SellingInvoices(RequestList)
            case "Purchase":
                Error = SearchFiltersValidation.PurchaseInvoices(RequestList)
            case _:
                return {"StatusCode":ErrorCodes.InvalidValue,"Variable":InvoiceType}
        if Error:
            return Error    
        return ProcessRequest.SearchInvoices(f"Project{ProjectID}", RequestList)
    
    @staticmethod
    def SearchTransitionDocuments(RequestList):
        try:
            ProjectID, StoreID, FromDateTime, ToDateTime = RequestList["ProjectID"], RequestList["StoreID"], RequestList["FromDateTime"], RequestList["ToDateTime"]
        except:
            return {"StatusCode":ErrorCodes.MissingVariables,"Data":""}
        if not isintstr(ProjectID): return {"StatusCode":ErrorCodes.InvalidDataType,"Variable":"ProjectID"}
        if not isintstr(StoreID): return {"StatusCode":ErrorCodes.InvalidDataType,"Variable":"StoreID"}
        try:
            datetime.strptime(FromDateTime,"%Y-%m-%dT%H:%M:%S")
        except:
            return {"StatusCode":ErrorCodes.InvalidValue,"Variable":"FromDateTime"}
        try:
            datetime.strptime(ToDateTime,"%Y-%m-%dT%H:%M:%S")
        except:
            return {"StatusCode":ErrorCodes.InvalidValue,"Variable":"ToDateTime"}
        if ProjectsDBsConnectors.get(int(ProjectID)) is None: return {"StatusCode":ErrorCodes.ValueNotFound,"Data":""}
        store_exists = Stores_Table.objects.using(f"Project{ProjectID}").filter(Store_ID=StoreID).exists()
        if not store_exists:
            return {"StatusCode":ErrorCodes.ValueNotFound,"Variable":"StoreID"}
        for Filter in RequestList.keys():
            match Filter:
                case "Document_ID" | "Source_Store_ID" | "Destination_Store_ID" | "Product_ID" | "Quantity":
                    if not isintstr(RequestList[Filter]): return {"StatusCode":ErrorCodes.InvalidDataType,"Variable": Filter}
                case "RequestType" | "InvoiceType" | "ProjectID" | "StoreID" | "FromDateTime" | "ToDateTime":
                    pass
                case _:
                    return {"StatusCode":ErrorCodes.InvalidValue,"Variable":"Filter","Filter":Filter}
        return ProcessRequest.SearchTransitionDocuments(f"Project{ProjectID}", RequestList)
    
    @staticmethod
    def GetInvoice(RequestList):
        try:
            ProjectID, InvoiceType, InvoiceID = RequestList["ProjectID"], RequestList["InvoiceType"], RequestList["InvoiceID"]
        except:
            return {"StatusCode":ErrorCodes.MissingVariables,"Data":""}
        if not isintstr(ProjectID): return {"StatusCode":ErrorCodes.InvalidDataType,"Data":""}
        if ProjectsDBsConnectors.get(int(ProjectID)) is None: return {"StatusCode":ErrorCodes.ValueNotFound,"Data":""}
        if not isintstr(InvoiceID): return {"StatusCode":ErrorCodes.InvalidDataType,"Data":""}
        if not InvoiceType in ValidInvoiceTypes: return {"StatusCode":ErrorCodes.InvalidValue,"Data":""}
        return ProcessRequest.GetInvoice(f"Project{ProjectID}", RequestList)
    
    @staticmethod
    def GetTransitionDocument(RequestList):
        try:
            ProjectID, DocumentID = RequestList["ProjectID"], RequestList["DocumentID"]
        except:
            return {"StatusCode":ErrorCodes.MissingVariables,"Data":""}
        if not isintstr(ProjectID): return {"StatusCode":ErrorCodes.InvalidDataType,"Data":""}
        if ProjectsDBsConnectors.get(int(ProjectID)) is None: return {"StatusCode":ErrorCodes.ValueNotFound,"Data":""}
        if not isintstr(DocumentID): return {"StatusCode":ErrorCodes.InvalidDataType,"Data":""}
        return ProcessRequest.GetTransitionDocument(f"Project{ProjectID}", RequestList)
    
    @staticmethod
    def AdjustProductQuantity(RequestList):
        try:
            ProjectID, StoreID, OperationType, ProductID, Quantity = (RequestList["ProjectID"],
                RequestList["StoreID"], RequestList["OperationType"], RequestList["ProductID"], RequestList["Quantity"])
        except:
            return {"StatusCode":ErrorCodes.MissingVariables,"Data":""}
        if ProjectsDBsConnectors.get(int(ProjectID)) is None: return {"StatusCode":ErrorCodes.ValueNotFound,"Data":""}

        if not isintstr(StoreID): return {"StatusCode":ErrorCodes.InvalidDataType,"Variable":"StoreID"}
        if not isintstr(ProductID): return {"StatusCode":ErrorCodes.InvalidDataType,"Variable":"ProductID"}
        if not isnumberstr(Quantity): return {"StatusCode":ErrorCodes.InvalidDataType,"Variable":"Quantity"}
        if OperationType not in ["MoreThanPurchaseInvoice", "LessThanPurchaseInvoice", "Damaged", "Fixed", "Lost", "Found"]:
            return {"StatusCode":ErrorCodes.InvalidValue,"Variable":"OperationType"}
        store = Stores_Table.objects.using(f"Project{ProjectID}").filter(Store_ID=StoreID).first()
        if store is None:
            return {"StatusCode":ErrorCodes.ValueNotFound,"Variable":"StoreID"}
        return ProcessRequest.AdjustProductQuantity(f"Project{ProjectID}", RequestList, store)
    
    @staticmethod
    def SearchAdjustmentOperations(RequestList):
        try:
            ProjectID, StoreID, FromDateTime, ToDateTime = (RequestList["ProjectID"], RequestList["StoreID"],
                RequestList["FromDateTime"], RequestList["ToDateTime"])
        except:
            return {"StatusCode":ErrorCodes.MissingVariables,"Data":""}
        if not isintstr(ProjectID): return {"StatusCode":ErrorCodes.InvalidDataType,"Data":""}
        if ProjectsDBsConnectors.get(int(ProjectID)) is None: return {"StatusCode":ErrorCodes.ValueNotFound,"Data":""}
        if not isintstr(StoreID): return {"StatusCode":ErrorCodes.InvalidDataType,"Data":""}
        try:
            datetime.strptime(FromDateTime,"%Y-%m-%dT%H:%M:%S")
        except:
            return {"StatusCode":ErrorCodes.InvalidValue,"Variable":"FromDateTime"}
        try:
            datetime.strptime(ToDateTime,"%Y-%m-%dT%H:%M:%S")
        except:
            return {"StatusCode":ErrorCodes.InvalidValue,"Variable":"ToDateTime"}
        store_exists = Stores_Table.objects.using(f"Project{ProjectID}").filter(Store_ID=StoreID).exists()
        if not store_exists:
            return {"StatusCode":ErrorCodes.ValueNotFound,"Variable":"StoreID"}
        for Filter in RequestList.keys():
            match Filter:
                case "Quantity" | "Operation_ID" | "Product_ID":
                    if not isintstr(RequestList[Filter]): return {"StatusCode":ErrorCodes.InvalidDataType,"Variable":Filter}
                case "RequestType" | "OperationType" | "ProjectID" | "StoreID" | "Product_Name" | "Trademark" | "Manufacture_Country" | "Note" | "FromDateTime" | "ToDateTime":
                    pass
                case _:
                    return {"StatusCode":ErrorCodes.InvalidValue,"Variable":"Filter","Filter":Filter}
        return ProcessRequest.SearchAdjustmentOperations(f"Project{ProjectID}", RequestList)


def StartRequestProcessing(Request):
    RequestList = Request.GET.dict()
    try:
        RequestType = RequestList["RequestType"]
    except:
        return {"StatusCode": ErrorCodes.MissingVariables,"Variable":"RequestType"}
    match RequestType:
        case "CreateProject":
            Response = CheckValidation.CreateProject(RequestList)
        case "GetProjects":
            Response = ProcessRequest.GetProjects()
        case "CreateAccount":
            Response = CheckValidation.CreateAccount(RequestList)
        case "AddStore":
            Response = CheckValidation.AddStore(RequestList)
        case "AddProduct":
            Response = CheckValidation.AddProduct(RequestList)
        case "GetStores":
            Response = CheckValidation.GetStores(RequestList)
        case "EditProductInfo":
            Response = CheckValidation.EditProductInfo(RequestList)
        case "GetProductInfo":
            Response = CheckValidation.GetProductInfo(RequestList)
        case "GetProductsQuantities":
            Response = CheckValidation.GetProductsQuantities(RequestList)
        case "Sell":
            Response = CheckValidation.Sell(RequestList)
        case "Purchase":
            Response = CheckValidation.Purchase(RequestList)
        case "Transit":
            Response = CheckValidation.Transit(RequestList)
        case "EditPurchaseInvoice":
            Response = CheckValidation.EditPurchaseInvoice(RequestList)
        case "EditSellingInvoice":
            Response = CheckValidation.EditSellingInvoice(RequestList)
        case "EditTransitionDocument":
            Response = CheckValidation.EditTransitionDocument(RequestList)
        case "DeletePurchaseInvoice":
            Response = CheckValidation.DeletePurchaseInvoice(RequestList)
        case "DeleteSellingInvoice":
            Response = CheckValidation.DeleteSellingInvoice(RequestList)
        case "DeleteTransitionDocument":
            Response = CheckValidation.DeleteTransitionDocument(RequestList)
        case "DeleteAdjustmentOperation":
            Response = CheckValidation.DeleteAdjustmentOperation(RequestList)
        case "AddToAccount":
            Response = CheckValidation.AddToAccount(RequestList)
        case "DeductFromAccount":
            Response = CheckValidation.DeductFromAccount(RequestList)
        case "SearchProducts":
            Response = CheckValidation.SearchProducts(RequestList)
        case "SearchInvoices":
            Response = CheckValidation.SearchInvoices(RequestList)
        case "SearchTransitionDocuments":
            Response = CheckValidation.SearchTransitionDocuments(RequestList)
        case "SearchAdjustmentOperations":
            Response = CheckValidation.SearchAdjustmentOperations(RequestList)
        case "GetInvoice":
            Response = CheckValidation.GetInvoice(RequestList)
        case "GetTransitionDocument":
            Response = CheckValidation.GetTransitionDocument(RequestList)
        case "AdjustProductQuantity":
            Response = CheckValidation.AdjustProductQuantity(RequestList)
        case _:
            Response = {"StatusCode": ErrorCodes.InvalidValue,"Variable": "RequestType"}
    Response = JsonResponse(Response)
    Response["Access-Control-Allow-Origin"] = "*"
    return Response
    #return JsonResponse(Response)

def test(Request):
    #r=StartRequestProcessing('{"Re":"ghl\'","h":[1,2,3],"i":{"g":"\'"}}')
    #r = StartRequestProcessing('{"RequestType":"SearchInvoices","InvoiceType":"Purchase","Filters":[{"Invoice_ID":1}]}')
    #r = StartRequestProcessing('{"RequestType":"SearchTransitionDocuments","Filters":[{"Document_ID":1}]}')
    #ProcessRequest('{"RequestType":"EditProductInfo","ProductID":2,"ProductName":"Combination Wrench",'
    #               '"Trademark":"King Tools","ManufactureCountry":"China","PurchasePrice":5,"WholesalePrice":60,'
    #               '"RetailPrice":65}')
    #r= StartRequestProcessing('{"RequestType":"GetProductInfo","ProductID":12}')
    #r=StartRequestProcessing('{"RequestType":"AddProduct","ProductName":"Combination Wrench","Trademark":"King Tools","ManufactureCountry":"China","PurchasePrice":20,"WholesalePrice":30,"RetailPrice":35,"PartialQuantityPrecision":0}')
    #r= StartRequestProcessing('{"RequestType":"Sell","StoreID":1,"ClientID":1,"Orders":[{"ProductID":12,"Quantity":2.0,"Price":9.0}],"Paid":8}')
    #r= StartRequestProcessing('{"RequestType":"Purchase","StoreID":1,"SellerID":1,"Orders":[{"ProductID":12,"Quantity":4,"Price":9}],"Paid":9}')
    #ProcessRequest('{"RequestType":"Transit","SourceStoreID":0,"DestinationStoreID":1,"Products":[{"ProductID":1,"Quantity":2},{"ProductID":2,"Quantity":2},{"ProductID":6,"Quantity":2}]}')
    #r = StartRequestProcessing('{"RequestType":"AdjustProductQuantity","StoreID":1,"ProductID":1,"CurrentQuantity":25.0,"Notes":"قيمة أولية"}')
    pass



