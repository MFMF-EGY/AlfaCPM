import { useState, useEffect, useRef, createContext, useContext, use } from 'react';
import axios from 'axios';
import { GlobalContext } from './App.jsx';
import { COMMERCIAL_API_URL } from './App.jsx';

const ProductsTabContext = createContext();

function ProductsTabContent({ref}){
  const { ProjectID } = useContext(GlobalContext);
  const { StoreID } = useContext(GlobalContext);
  const [ SearchParam, setSearchParam ] = useState({
    ProductID: "",
    ProductName: "",
    Trademark: "",
    ManufactureCountry: "",
    PurchasePrice: "",
    WholesalePrice: "",
    RetailPrice: "",
    LargeQuantityUnit: "",
    SmallQuantityUnit: ""
  });
  const [ UpdateTab, setUpdateTab ] = useState(0);
  const [ ProductsList, setProductsList] = useState([]);
  const [ OpendForm, setOpendForm ] = useState(null);
  const AddProductFormRef = useRef(null);
  const EditProductButtonRef = useRef(null);
  const EditProductFormRef = useRef(null);
  const SearchProductsFormRef = useRef(null);
  const PrintProductsFormRef = useRef(null);

  const SelectedRow = useRef(null);
  
  useEffect(() => {
    if (SelectedRow.current){SelectedRow.current.classList.remove("Selected-row");}
    SelectedRow.current = null;
    EditProductButtonRef.current.disabled = true;
    setOpendForm(null); 
    fetchProducts();
  }, [UpdateTab, ProjectID, StoreID]);

  const fetchProducts = async () => {
    var RequestParams = { RequestType: "SearchProducts", ProjectID: ProjectID, StoreID: StoreID };
    if (SearchParam.ProductID){ RequestParams.Product_ID__Product_ID = SearchParam.ProductID; }
    if (SearchParam.ProductName){ RequestParams.Product_ID__Product_Name = SearchParam.ProductName; }
    if (SearchParam.Trademark){ RequestParams.Product_ID__Trademark = SearchParam.Trademark; }
    if (SearchParam.ManufactureCountry){ RequestParams.Product_ID__Manufacture_Country = SearchParam.ManufactureCountry; }
    if (SearchParam.PurchasePrice){ RequestParams.Product_ID__Purchase_Price = SearchParam.PurchasePrice; }
    if (SearchParam.WholesalePrice){ RequestParams.Product_ID__Wholesale_Price = SearchParam.WholesalePrice; }
    if (SearchParam.RetailPrice){ RequestParams.Product_ID__Retail_Price = SearchParam.RetailPrice; }
    if (SearchParam.LargeQuantityUnit){ RequestParams.Product_ID__Large_Quantity = SearchParam.LargeQuantityUnit; }
    if (SearchParam.SmallQuantityUnit){ RequestParams.Product_ID__Small_Quantity = SearchParam.SmallQuantityUnit; }
    await axios.get(COMMERCIAL_API_URL, {params: RequestParams})
      .then(
        (response)=>{
          if (!response.data.StatusCode){
            setProductsList(response.data.Data.sort((a, b) => {
              if (a.Product_ID__Product_Order < b.Product_ID__Product_Order) return -1;
              if (a.Product_ID__Product_Order > b.Product_ID__Product_Order) return 1;
              return 0;
            }));
          }
          else
            {console.log(response.data)}
        })
      .catch((err)=>{console.log(err)});
  }

  return(
    <ProductsTabContext.Provider value={{ SearchParam, setSearchParam, UpdateTab, setUpdateTab, ProductsList, setProductsList, OpendForm, setOpendForm, AddProductFormRef,
      EditProductButtonRef, EditProductFormRef, SearchProductsFormRef, PrintProductsFormRef, SelectedRow }}>
      <div className="Main-tab-content">
        <div className="Table-container">
          <table className="Table" id="Products-table">
            <thead>
              <tr>
                <th>م</th>
                <th>الكود</th>
                <th>اسم المنتج</th>
                <th>العلامة التجارية</th>
                <th>بلد التصنيع</th>
                <th>سعر الشراء</th>
                <th>سعر بيع الجملة</th>
                <th>سعر بيع التجزئة</th>
                <th>الكمية الكبيرة</th>
                <th>الكمية الصغيرة</th>
              </tr>
            </thead>
            <tbody>
              <ProductsTableBody/>
            </tbody>
          </table>
          {OpendForm === "AddProductForm" ? <AddProductForm></AddProductForm> :
           OpendForm === "SearchProductsForm" ? <SearchProductsForm></SearchProductsForm> :
           OpendForm === "EditProductForm" && <EditProductForm></EditProductForm>}
        </div>
        <div className='Side-bar'>
          <button className="Sidebar-button" onClick={(event) => setOpendForm("AddProductForm")}>إضافة منتج</button>
          <button className="Sidebar-button" ref={EditProductButtonRef} 
            onClick={(event) => setOpendForm("EditProductForm")}>تعديل منتج</button>
          <button className="Sidebar-button" onClick={(event) => setOpendForm("SearchProductsForm")}>بحث</button>
          <button className="Sidebar-button">طباعة المنتجات</button>
        </div>
      </div>
    </ProductsTabContext.Provider>
  );
}
function AddProductForm(){
  const { ProjectID, StoreID } = useContext(GlobalContext);
  const { UpdateTab, setUpdateTab, ProductsList, SelectedRow, AddProductFormRef, setOpendForm } = useContext(ProductsTabContext);
  const AddProductNameRef = useRef();
  const AddProductTrademarkRef = useRef();
  const AddProductManufactureCountryRef = useRef();
  const AddProductPurchasePriceRef = useRef();
  const AddProductWholesalePriceRef = useRef();
  const AddProductRetailPriceRef = useRef();
  const AddProductLargeQuantityUnitRef = useRef();
  const AddProductSmallQuantityUnitRef = useRef();
  const AddProductConversionRateRef = useRef();
  const AddProductPartialSmallQuantityAllowedRef = useRef();
  const AddProduct = (event) => {
    var RequestParams = {
      RequestType:"AddProduct",
      ProjectID: ProjectID,
      StoreID: StoreID,
      ProductName: AddProductNameRef.current.value,
      Trademark: AddProductTrademarkRef.current.value,
      ManufactureCountry: AddProductManufactureCountryRef.current.value,
      PurchasePrice: AddProductPurchasePriceRef.current.value,
      WholesalePrice: AddProductWholesalePriceRef.current.value,
      RetailPrice: AddProductRetailPriceRef.current.value,
      LargeQuantityUnit: AddProductLargeQuantityUnitRef.current.value,
      SmallQuantityUnit: AddProductSmallQuantityUnitRef.current.value,
      ConversionRate: AddProductConversionRateRef.current.value,
      PartialSmallQuantityAllowed: AddProductPartialSmallQuantityAllowedRef.current.checked == true ? "True" : "False"
    };
    // if (SelectedRow.current){
    //   RequestParams.ProductOrder = ProductsList[SelectedRow.current.rowIndex - 1].Product_Order + 1;
    // }
    
    axios.get(COMMERCIAL_API_URL, {params: RequestParams},)
      .then((response)=>{
        if (!response.data.StatusCode){
          setUpdateTab(UpdateTab + 1);
        }else{
          console.log(response.data);
        }
      })
      .catch((error) => {console.log(error);});
  
  }
  return(
    <div className="Form-container" id="Add-product-form" ref={AddProductFormRef}>
      <div className="Form">
        <div>
          <button className='Form-close' onClick={(event) => setOpendForm("")}>X</button>
        </div>
        <div>
          <label>اسم المنتج</label>
          <input type="text" ref={AddProductNameRef}></input>
        </div>
        <div>
          <label>العلامة التجارية</label>
          <input type="text" ref={AddProductTrademarkRef}></input>
        </div>
        <div>
          <label>بلد التصنيع</label>
          <input type="text" ref={AddProductManufactureCountryRef}></input>
        </div>
        <div>
          <label>سعر الشراء</label>
          <input type="number" ref={AddProductPurchasePriceRef}></input>
        </div>
        <div>
          <label>سعر بيع الجملة</label>
          <input type="number" ref={AddProductWholesalePriceRef}></input>
        </div>
        <div>
          <label>سعر بيع التجزئة</label>
          <input type="number" ref={AddProductRetailPriceRef}></input>
        </div>
        <div>
          <label>وحدة القياس الكبرى</label>
          <input type="text" ref={AddProductLargeQuantityUnitRef}></input>
        </div>
        <div>
          <label>وحدة القياس الصغرى</label>
          <input type="text" ref={AddProductSmallQuantityUnitRef}></input>
        </div>
        <div>
          <label>نسبة التحويل</label>
          <input type="number" ref={AddProductConversionRateRef}></input>
        </div>
        <div>
          <label>السماح بكمية صغيرة جزئية</label>
          <input type="checkbox" ref={AddProductPartialSmallQuantityAllowedRef}></input>
        </div>
        <div>
          <button onClick={(event) => AddProduct(event)}>إضافة</button>
        </div>
      </div>
    </div>
  );
}

function SearchProductsForm(){
  const { SearchParam, setSearchParam, UpdateTab, setUpdateTab, setOpendForm } = useContext(ProductsTabContext);
  const SearchProductsIdRef = useRef(null);
  const SearchProductsNameRef = useRef(null);
  const SearchProductsTrademarkRef = useRef(null);
  const SearchProductsManufactureCountryRef = useRef(null);
  const SearchProductsPurchasePriceRef = useRef(null);
  const SearchProductsWholesalePriceRef = useRef(null);
  const SearchProductsRetailPriceRef = useRef(null);
  const SearchProducts = () => {
    setSearchParam({
      ProductID: SearchProductsIdRef.current.value,
      ProductName: SearchProductsNameRef.current.value,
      Trademark: SearchProductsTrademarkRef.current.value,
      ManufactureCountry: SearchProductsManufactureCountryRef.current.value,
      PurchasePrice: SearchProductsPurchasePriceRef.current.value,
      WholesalePrice: SearchProductsWholesalePriceRef.current.value,
      RetailPrice: SearchProductsRetailPriceRef.current.value
    });
    setUpdateTab(UpdateTab + 1);
  }
  return(
    <div className="Form-container">
      <div className="Form">
        <div>
          <button className='Form-close' onClick={() => setOpendForm("")}>X</button>
        </div>
        <div>
          <label>الرقم التعريفي</label>
          <input type="text" defaultValue={SearchParam.ProductID} ref={SearchProductsIdRef}></input>
        </div>
        <div>
          <label>اسم المنتج</label>
          <input type="text" defaultValue={SearchParam.ProductName} ref={SearchProductsNameRef}></input>
        </div>
        <div>
          <label>العلامة التجارية</label>
          <input type="text" defaultValue={SearchParam.Trademark} ref={SearchProductsTrademarkRef}></input>
        </div>
        <div>
          <label>بلد التصنيع</label>
          <input type="text" defaultValue={SearchParam.ManufactureCountry} ref={SearchProductsManufactureCountryRef}></input>
        </div>
        <div>
          <label>سعر الشراء</label>
          <input type="number" defaultValue={SearchParam.PurchasePrice} ref={SearchProductsPurchasePriceRef}></input>
        </div>
        <div>
          <label>سعر بيع الجملة</label>
          <input type="number" defaultValue={SearchParam.WholesalePrice} ref={SearchProductsWholesalePriceRef}></input>
        </div>
        <div>
          <label>سعر بيع التجزئة</label>
          <input type="number" defaultValue={SearchParam.RetailPrice} ref={SearchProductsRetailPriceRef}></input>
        </div>
        <div>
          <button onClick={(event) => SearchProducts(event)}>ابحث</button>
        </div>
      </div>
    </div>
  );
}

function EditProductForm(){
  const { ProjectID } = useContext(GlobalContext);
  const { UpdateTab, setUpdateTab, ProductsList, SelectedRow, EditProductFormRef, setOpendForm } = useContext(ProductsTabContext);
  const EditProductID = useRef(null);
  const EditProductName = useRef(null);
  const EditProductTrademark = useRef(null);
  const EditProductManufactureCountry = useRef(null);
  const EditProductPurchasePrice = useRef(null);
  const EditProductWholesalePrice = useRef(null);
  const EditProductRetailPrice = useRef(null);
  const EditProductLargeQuantityUnit = useRef(null);
  const EditProductSmallQuantityUnit = useRef(null);
  const EditProductConversionRate = useRef(null);
  const EditProductPartialSmallQuantityAllowed = useRef(null);
  const EditProduct = () => {
    var RequestParams = {RequestType:"EditProductInfo",
      ProjectID:ProjectID,
      ProductID:EditProductID.current.value,
      ProductName:EditProductName.current.value,
      Trademark:EditProductTrademark.current.value,
      ManufactureCountry:EditProductManufactureCountry.current.value,
      PurchasePrice:EditProductPurchasePrice.current.value,
      WholesalePrice:EditProductWholesalePrice.current.value,
      RetailPrice:EditProductRetailPrice.current.value,
      LargeQuantityUnit:EditProductLargeQuantityUnit.current.value,
      SmallQuantityUnit: EditProductSmallQuantityUnit.current.value,
      ConversionRate: EditProductConversionRate.current.value,
      PartialSmallQuantityAllowed: EditProductPartialSmallQuantityAllowed.current.checked == true ? "True" : "False"
    };
    axios.get(COMMERCIAL_API_URL, {params: RequestParams})
      .then((response)=>{
        if (!response.data.StatusCode){
          setUpdateTab(UpdateTab + 1);
        }else{
          console.log(response.data);
        }
      })
      .catch((error) => {console.log(error);});
  }

  useEffect(() => {
    if (SelectedRow){
      let RowIndex = SelectedRow.current.rowIndex - 1;
      EditProductID.current.value = ProductsList[RowIndex].Product_ID__Product_ID;
      EditProductName.current.value = ProductsList[RowIndex].Product_ID__Product_Name;
      EditProductTrademark.current.value = ProductsList[RowIndex].Product_ID__Trademark;
      EditProductManufactureCountry.current.value = ProductsList[RowIndex].Product_ID__Manufacture_Country;
      EditProductPurchasePrice.current.value = ProductsList[RowIndex].Product_ID__Purchase_Price;
      EditProductWholesalePrice.current.value = ProductsList[RowIndex].Product_ID__Wholesale_Price;
      EditProductRetailPrice.current.value = ProductsList[RowIndex].Product_ID__Retail_Price;
      EditProductLargeQuantityUnit.current.value = ProductsList[RowIndex].Product_ID__Large_Quantity_Unit;
      EditProductSmallQuantityUnit.current.value = ProductsList[RowIndex].Product_ID__Small_Quantity_Unit;
      EditProductConversionRate.current.value = ProductsList[RowIndex].Product_ID__Conversion_Rate;
      EditProductPartialSmallQuantityAllowed.current.checked = ProductsList[RowIndex].Product_ID__Partial_Small_Quantity_Allowed;
    }
  })

  return(
    <div className="Form-container" ref={EditProductFormRef}>
      <div className="Form">
        <div>
          <button className='Form-close' onClick={() => setOpendForm("")}>X</button>
        </div>
        <div>
          <label>الرقم التعريفي</label>
          <input type="text" ref={EditProductID} />
        </div>
        <div>
          <label>اسم المنتج</label>
          <input type="text" ref={EditProductName} />
        </div>
        <div>
          <label>العلامة التجارية</label>
          <input type="text" ref={EditProductTrademark} />
        </div>
        <div>
          <label>بلد التصنيع</label>
          <input type="text" ref={EditProductManufactureCountry} />
        </div>
        <div>
          <label>سعر الشراء</label>
          <input type="number" ref={EditProductPurchasePrice} />
        </div>
        <div>
          <label>سعر بيع الجملة</label>
          <input type="number" ref={EditProductWholesalePrice} />
        </div>
        <div>
          <label>سعر بيع التجزئة</label>
          <input type="number" ref={EditProductRetailPrice} />
        </div>
        <div>
          <label>وحدة القياس الكبرى</label>
          <input type="text" ref={EditProductLargeQuantityUnit} />
        </div>
        <div>
          <label>وحدة القياس الصغرى</label>
          <input type="text" ref={EditProductSmallQuantityUnit} />
        </div>
        <div>
          <label>نسبة التحويل</label>
          <input type="number" ref={EditProductConversionRate} />
        </div>
        <div>
          <label>السماح بكمية صغيرة جزئية</label>
          <input type="checkbox" ref={EditProductPartialSmallQuantityAllowed} />
        </div>
        <div>
          <button onClick={() => EditProduct()}>تعديل</button>
        </div>
      </div>
    </div>
  );
}

function ProductsTableBody(){
  const { ProductsList, SelectedRow, EditProductButtonRef } = useContext(ProductsTabContext);
  
  const selectRow = (event) => {
    if (SelectedRow.current){SelectedRow.current.classList.remove("Selected-row");}
    SelectedRow.current = event.currentTarget;
    SelectedRow.current.classList.add("Selected-row");
    EditProductButtonRef.current.disabled = false;
  }

  return (
    ProductsList.map((product, index) => (
      <tr onClick={(event)=>selectRow(event)}>
        <td>{index + 1}</td>
        <td>{product.Product_ID__Product_ID}</td>
        <td>{product.Product_ID__Product_Name}</td>
        <td>{product.Product_ID__Trademark}</td>
        <td>{product.Product_ID__Manufacture_Country}</td>
        <td>{product.Product_ID__Purchase_Price}</td>
        <td>{product.Product_ID__Wholesale_Price}</td>
        <td>{product.Product_ID__Retail_Price}</td>
        <td>{Math.floor(product.Quantity / product.Product_ID__Conversion_Rate) + " " + product.Product_ID__Large_Quantity_Unit}</td>
        <td>{(product.Quantity % product.Product_ID__Conversion_Rate) + " " + product.Product_ID__Small_Quantity_Unit}</td>
      </tr>
    ))
  );
}
export default ProductsTabContent;
      