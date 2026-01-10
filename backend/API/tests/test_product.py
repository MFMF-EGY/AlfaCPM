import pytest
from django.test import Client
from API.models import *

# TODO: Add tests for error cases.
# TODO: Adjust tests to cover small quantity and large quantity.
@pytest.mark.django_db(transaction=True, databases="__all__")
def test_add_product(client: Client, create_test_project, django_db_blocker):
    ProjectDBName = f"Project{create_test_project}"
    store = Stores_Table(
        Store_Name="Test Store",
        Store_Address="123 Test St"
    )
    store.save(using=ProjectDBName)
    with django_db_blocker.unblock():
        response = client.get('/apis/v1.0/commercial', {
            'RequestType': 'AddProduct',
            'ProjectID': create_test_project,
            'ProductName': 'Test Product',
            'Trademark': 'Test Trademark',
            'ManufactureCountry': 'Test Country',
            'PurchasePrice': 100,
            'WholesalePrice': 150,
            'RetailPrice': 200,
            'QuantityUnit': 'Test Unit'
        })
    assert response.status_code == 200
    assert response.json().get("StatusCode") == 0
    product_quantity = Product_Quantity_Table.objects.using(ProjectDBName).filter(
        Store_ID=store.Store_ID
    ).first()
    assert product_quantity is not None
    assert product_quantity.Quantity == 0

@pytest.mark.django_db(transaction=True, databases="__all__")
def test_adjust_product_quantity(client: Client, create_test_project, django_db_blocker):
    ProjectDBName = f"Project{create_test_project}"
    store = Stores_Table(
        Store_Name="Test Store",
        Store_Address="123 Test St"
    )
    store.save(using=ProjectDBName)
    product = Products_Table(
        Product_Order=1,
        Product_Name="Test Product",
        Trademark="Test Trademark",
        Manufacture_Country="Test Country",
        Purchase_Price=100,
        Wholesale_Price=150,
        Retail_Price=200,
        Quantity_Unit="Test Unit"
    )
    product.save(using=ProjectDBName)
    product_quantity = Product_Quantity_Table(
        Store_ID=store,
        Product_ID=product,
        Quantity=0
    )
    product_quantity.save(using=ProjectDBName)
    with django_db_blocker.unblock():
        response = client.get('/apis/v1.0/commercial', {
            'RequestType': 'AdjustProductQuantity',
            'ProjectID': create_test_project,
            'StoreID': store.Store_ID,
            'ProductID': product.Product_ID,
            'OperationType': 'MoreThanPurchaseInvoice',
            'Quantity': 10
        })
        assert response.status_code == 200
        assert response.json().get("StatusCode") == 0
        product_quantity = Product_Quantity_Table.objects.using(ProjectDBName).filter(
            Store_ID=store.Store_ID,
            Product_ID=product.Product_ID
        ).first()
        assert product_quantity is not None
        assert product_quantity.Quantity == 10

        response = client.get('/apis/v1.0/commercial', {
            'RequestType': 'AdjustProductQuantity',
            'ProjectID': create_test_project,
            'StoreID': store.Store_ID,
            'ProductID': product.Product_ID,
            'OperationType': 'Fixed',
            'Quantity': 10
        })
        assert response.status_code == 200
        assert response.json().get("StatusCode") == 0
        product_quantity.refresh_from_db()
        assert product_quantity.Quantity == 20

        response = client.get('/apis/v1.0/commercial', {
            'RequestType': 'AdjustProductQuantity',
            'ProjectID': create_test_project,
            'StoreID': store.Store_ID,
            'ProductID': product.Product_ID,
            'OperationType': 'Found',
            'Quantity': 10
        })
        assert response.status_code == 200
        assert response.json().get("StatusCode") == 0
        product_quantity.refresh_from_db()
        assert product_quantity.Quantity == 30

        response = client.get('/apis/v1.0/commercial', {
            'RequestType': 'AdjustProductQuantity',
            'ProjectID': create_test_project,
            'StoreID': store.Store_ID,
            'ProductID': product.Product_ID,
            'OperationType': 'LessThanPurchaseInvoice',
            'Quantity': 10
        })
        assert response.status_code == 200
        assert response.json().get("StatusCode") == 0
        product_quantity.refresh_from_db()
        assert product_quantity.Quantity == 20

        response = client.get('/apis/v1.0/commercial', {
            'RequestType': 'AdjustProductQuantity',
            'ProjectID': create_test_project,
            'StoreID': store.Store_ID,
            'ProductID': product.Product_ID,
            'OperationType': 'Damaged',
            'Quantity': 10
        })
        assert response.status_code == 200
        assert response.json().get("StatusCode") == 0
        product_quantity.refresh_from_db()
        assert product_quantity.Quantity == 10

        response = client.get('/apis/v1.0/commercial', {
            'RequestType': 'AdjustProductQuantity',
            'ProjectID': create_test_project,
            'StoreID': store.Store_ID,
            'ProductID': product.Product_ID,
            'OperationType': 'Lost',
            'Quantity': 10
        })
        assert response.status_code == 200
        assert response.json().get("StatusCode") == 0
        product_quantity.refresh_from_db()
        assert product_quantity.Quantity == 0
    