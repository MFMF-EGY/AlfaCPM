import pytest
from django.test import Client
from API.models import *

@pytest.mark.django_db(transaction=True, databases="__all__")
def test_purchase(client: Client, create_test_project, django_db_blocker):
    ProjectDBName = f"Project{create_test_project}"
    store = Stores_Table(
        Store_Name="Test Store",
        Store_Address="123 Test St"
    )
    store.save(using=ProjectDBName)
    product = Products_Table(
        Product_Order = 1,
        Product_Name = "TestProduct",
        Trademark = "TestTrademark",
        Manufacture_Country = "TestCountry",
        Purchase_Price = 10.00,
        Wholesale_Price = 12.00,
        Retail_Price = 15.00,
        Small_Quantity_Unit = "piece",
        Large_Quantity_Unit = "box",
        Conversion_Rate = 10.0,
        Partial_Small_Quantity_Allowed = False
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
            'RequestType': 'Purchase',
            'ProjectID': create_test_project,
            'StoreID': store.Store_ID,
            'SellerName': 'Test Seller',
            'Items[0][ProductID]': product.Product_ID,
            'Items[0][LargeQuantity]': 1,
            'Items[0][SmallQuantity]': 5,
            'Items[0][UnitPrice]': 10.00,
            'Paid': 150.00,
        })
        assert response.status_code == 200
        assert response.json().get("StatusCode") == 0
        purchase_invoice = Purchase_Invoices.objects.using(ProjectDBName).filter(
            Store_ID=store.Store_ID,
            Seller_Name='Test Seller'
        ).first()
        assert purchase_invoice is not None
        assert purchase_invoice.Total_Price == 150.00
        assert purchase_invoice.Paid == 150.00
        assert purchase_invoice.Deducted_From_Debt_Account == 0.00
        purchase_item = Purchase_Items.objects.using(ProjectDBName).filter(
            Invoice_ID=purchase_invoice.Invoice_ID,
            Product_ID=product.Product_ID
        ).first()
        assert purchase_item is not None
        assert purchase_item.Quantity == 15.0  # 1 box (10) + 5 pieces
        product_quantity.refresh_from_db()
        assert product_quantity.Quantity == 15.0