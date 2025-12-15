import { useState, useEffect, useRef, createContext, useContext } from 'react';
import axios from 'axios';
import { GlobalContext } from './App.js';
import { InvoiceItem } from './ItemComponents.js';
import ItemsListEditor from './ItemsListEditor.js';
import SellingInvoiceTemplate from './DocumentsTemplates/SellingInvoiceTemplate.js';
import { API_URL } from './App.js';

const CurrentDateTime = new Date(Date.now());
const SellingTabContext = createContext();

function SellingTabContent(){
  const { ProjectID } = useContext(GlobalContext);
  const { StoreID } = useContext(GlobalContext);
  const [ SearchParam, setSearchParam ] = useState({
    InvoiceID: "",
    ClientName: "",
    FromDateTime:
      CurrentDateTime.getFullYear() +
      "-" +
      (CurrentDateTime.getMonth() + 1).toString().padStart(2, "0") +
      "-" +
      CurrentDateTime.getDate().toString().padStart(2, "0") +
      "T" +
      "00:00:00",
    ToDateTime:
      CurrentDateTime.getFullYear() +
      "-" +
      (CurrentDateTime.getMonth() + 1).toString().padStart(2, "0") +
      "-" +
      CurrentDateTime.getDate().toString().padStart(2, "0") +
      "T" +
      "23:59:59",
    TotalPrice: "",
    Paid: "",
  });
  const [ UpdateTab, setUpdateTab ] = useState(0);
  const [ InvoicesList, setInvoicesList] = useState([]);
  const [ OpendForm, setOpendForm ] = useState(null);
  
  const EditInvoiceButtonRef = useRef(null);
  const DeleteInvoiceButtonRef = useRef(null);
  const PrintInvoiceButtonRef = useRef(null);
  const SelectedRow = useRef(null);
  
  useEffect(() => {
    if (SelectedRow.current){SelectedRow.current.classList.remove("Selected-row");}
    SelectedRow.current = null;
    EditInvoiceButtonRef.current.disabled = true;
    DeleteInvoiceButtonRef.current.disabled = true;
    PrintInvoiceButtonRef.current.disabled = true;
    setOpendForm(null); 
    fetchInvoices();
  }, [UpdateTab, ProjectID, StoreID]);

  const fetchInvoices = async () => {
    let RequestParams = {
      RequestType:"SearchInvoices",
      InvoiceType:"Selling",
      ProjectID:ProjectID,
      StoreID:StoreID
    };
    if (SearchParam.InvoiceID){ RequestParams.Invoice_ID = SearchParam.InvoiceID; }
    if (SearchParam.ClientName){ RequestParams.Seller_Name = SearchParam.SellerName; }
    if (SearchParam.FromDateTime){ RequestParams.FromDateTime = SearchParam.FromDateTime; }
    if (SearchParam.ToDateTime){ RequestParams.ToDateTime = SearchParam.ToDateTime; }
    if (SearchParam.TotalPrice){ RequestParams.Total_Price = SearchParam.TotalPrice; }
    if (SearchParam.Paid){ RequestParams.Paid = SearchParam.Paid; }
    await axios.get(API_URL, {params: RequestParams})
      .then(
        (response)=>{
          if (!response.data.StatusCode)
            {setInvoicesList(response.data.Data)}
          else
            {console.log(response.data)}
        })
      .catch((err)=>{console.log(err)});
  }
  
  const deleteInvoice = async (InvoiceID) => {
    var RequestParams = {
      RequestType: "DeleteSellingInvoice",
      ProjectID: ProjectID, 
      InvoiceID: InvoiceID
    };
    await axios.get(API_URL, {params: RequestParams})
      .then(
        (response)=>{
          if (!response.data.StatusCode)
            {setUpdateTab(UpdateTab + 1)}
          else
            {console.log(response.data)}
        })
      .catch((err)=>{console.log(err)});
  }
  const printInvoice = async (InvoiceID) => {
    var RequestParams = {
      RequestType: "GetInvoice",
      InvoiceType: "Selling",
      ProjectID: ProjectID,
      InvoiceID: InvoiceID
    };
    await axios.get(API_URL, {params: RequestParams})
      .then((response) => {
        if (!response.data.StatusCode){
          let InvoiceData = response.data.Data;

          let InvoiceTemplate = SellingInvoiceTemplate(InvoiceData);

          const printWindow = window.open('', '', 'width=800,height=600');
          printWindow.document.write(InvoiceTemplate);
          printWindow.document.close();
          printWindow.print();
        }
      })
      .catch((error) => {
        console.log(error);
      });
  }

  return(
    <SellingTabContext.Provider value={{ SearchParam, setSearchParam, UpdateTab, setUpdateTab, InvoicesList,
      setInvoicesList, OpendForm, setOpendForm, SelectedRow, EditInvoiceButtonRef, DeleteInvoiceButtonRef, PrintInvoiceButtonRef }}>
      <div className="Main-tab-content">
        <div className="Table-container">
          <table className="Table" id="Selling-table">
            <thead>
              <tr>
                <th>م</th>
                <th>الكود</th>
                <th>اسم العميل</th>
                <th>الوقت والتاريخ</th>
                <th>المبلغ المطلوب</th>
                <th>المبلغ المدفوع</th>
                <th>محول لحساب الدين</th>
              </tr>
            </thead>
            <tbody>
              <SellingInvoicesTableBody/>
            </tbody> 
          </table>
          {OpendForm === "CreateInvoiceForm" ? <CreateInvoiceForm/> :
           OpendForm === "SearchInvoicesForm" ? <SearchInvoicesForm/> :
           OpendForm === "EditInvoiceForm" && <EditInvoiceForm/>}
        </div>
        <div className='Side-bar'>
          <button className="Sidebar-button" onClick={() => setOpendForm("CreateInvoiceForm")}>إنشاء فاتورة</button>
          <button className="Sidebar-button" ref={EditInvoiceButtonRef} 
            onClick={() => setOpendForm("EditInvoiceForm")}>تعديل فاتورة</button>
          <button className="Sidebar-button" ref={DeleteInvoiceButtonRef}
            onClick={() => deleteInvoice(SelectedRow.current.children[1].innerText)}>حذف فاتورة</button>
          <button className="Sidebar-button" onClick={() => setOpendForm("SearchInvoicesForm")}>بحث</button>
          <button className="Sidebar-button" onClick={() => printInvoice(SelectedRow.current.children[1].innerText)}
            ref={PrintInvoiceButtonRef}>طباعة فاتورة</button>  
        </div>

      </div>
    </SellingTabContext.Provider> 
  );
}

function SearchInvoicesForm(){
  const { SearchParam, setSearchParam, UpdateTab, setUpdateTab, setOpendForm } = useContext(SellingTabContext);
  const InvoiceIDFieldRef = useRef();
  const SellerNameFieldRef = useRef();
  const FromDateTimeFieldRef = useRef();
  const ToDateTimeFieldRef = useRef();
  const TotalPriceFieldRef = useRef();
  const PaidFieldRef = useRef();

  const SearchInvoices = () => {
    let From_Date_Time = new Date(FromDateTimeFieldRef.current.value);
    let To_Date_Time = new Date(ToDateTimeFieldRef.current.value);
    setSearchParam({
      InvoiceID: InvoiceIDFieldRef.current.value,
      SellerName: SellerNameFieldRef.current.value,
      FromDateTime:
        From_Date_Time.getFullYear() +
        "-" +
        (From_Date_Time.getMonth() + 1)
          .toString()
          .padStart(2, "0") +
        "-" +
        From_Date_Time
          .getDate()
          .toString()
          .padStart(2, "0") +
        "T" +
        From_Date_Time
          .getHours()
          .toString()
          .padStart(2, "0") +
        ":" +
        From_Date_Time
          .getMinutes()
          .toString()
          .padStart(2, "0") +
        ":" +
        From_Date_Time
          .getSeconds()
          .toString()
          .padStart(2, "0"),
      ToDateTime: 
        To_Date_Time.getFullYear() +
        "-" +
        (To_Date_Time.getMonth() + 1)
          .toString()
          .padStart(2, "0") +
        "-" +
        To_Date_Time
          .getDate()
          .toString()
          .padStart(2, "0") +
        "T" +
        To_Date_Time
          .getHours()
          .toString()
          .padStart(2, "0") +
        ":" +
        To_Date_Time
          .getMinutes()
          .toString()
          .padStart(2, "0") +
        ":" +
        To_Date_Time
          .getSeconds()
          .toString()
          .padStart(2, "0"),
      TotalPrice: TotalPriceFieldRef.current.value,
      Paid: PaidFieldRef.current.value,
    });
    setUpdateTab(UpdateTab + 1);
  }
  return(
    <div className='Form-container'>
      <div className="Form">
        <div>
          <button className="Form-close" onClick={(event) => setOpendForm("")}>X</button>
        </div>
        <div>
          <label>الكود</label>
          <input type="number" defaultValue={SearchParam.InvoiceID} ref={InvoiceIDFieldRef}/>
        </div>
        <div>
          <label>اسم البائع</label>
          <input type="text" defaultValue={SearchParam.SellerName} ref={SellerNameFieldRef} />
        </div>
        <div>
          <label>بداية الوقت والتاريخ</label>
          <input type="datetime-local" step="1" defaultValue={SearchParam.FromDateTime} ref={FromDateTimeFieldRef} />
        </div>
        <div>
          <label>نهاية الوقت والتاريخ</label>
          <input type="datetime-local" step="1" defaultValue={SearchParam.ToDateTime} ref={ToDateTimeFieldRef} />
        </div>
        <div>
          <label>إجمالي المبلغ</label>
          <input type="number" defaultValue={SearchParam.TotalPrice} ref={TotalPriceFieldRef} />
        </div>
        <div>
          <label>المدفوع</label>
          <input type="number" defaultValue={SearchParam.Paid} ref={PaidFieldRef} />
        </div>
        <div>
          <button className="Form-submit" onClick={() => SearchInvoices()}>بحث</button>
        </div>
      </div>
    </div>
  )
}

function CreateInvoiceForm(){
  const { ProjectID, StoreID } = useContext(GlobalContext);
  const { UpdateTab, setUpdateTab, setOpendForm } = useContext(SellingTabContext);
  const [ Submiting, setSubmiting ] = useState(false);
  const [ InvoiceInfo, setInvoiceInfo ] = useState({
    SellerName: "",
    TotalPrice: "",
    Paid: "",
    TransferredToAccount: ""
  });
  const [ ItemsList, setItemsList ] = useState(Array.from({ length: 12 }, () => ({
    ProductName: "",
    ProductID: "",
    Trademark: "",
    ManufactureCountry: "",
    Quantity: "",
    QuantityUnit: "",
    UnitPrice: "",
    Price: ""
  })));
  const [ ValidationChecker, setValidationChecker ] = useState(Array.from({ length: 12 }, () => undefined));
  const [ SelectedItemIndex, setSelectedItemIndex ] = useState(null);
  const ExistingQuantities = useRef([]);
  const InsufficientQuantityProducts = useRef([]);

  const fetchExistingQuantites = async (ItemsList) => {
    let RequestParams = {
      RequestType: "GetProductsQuantities",
      ProjectID: ProjectID,
      StoreID: StoreID,
    }
    let ProductIDs = ItemsList.map((item) => item.ProductID);
    for (let i = 0; i < ProductIDs.length; i++){
      RequestParams[`ProductsIDs[${i}]`] = ProductIDs[i] ? ProductIDs[i] : undefined;
    }
    await axios.get(API_URL, {params: RequestParams})
      .then((response) => {
        if (!response.data.StatusCode){
          ExistingQuantities.current = response.data.Data;
        }else{
          console.log(response.data);
        }
      })
      .catch((error) => {
        console.log(error);
      })
  }

  const createInvoice = async () => {
    setSubmiting(true);
    var RequestParams = {
      RequestType: "Sell",
      ProjectID: ProjectID,
      StoreID: StoreID,
      ClientName: InvoiceInfo.SellerName,
      Orders: ItemsList.map((item) => (item.ProductID !== "" && item.Quantity !== "" && item.UnitPrice !== "" ? {
        ProductID: item.ProductID,
        Quantity: item.Quantity,
        UnitPrice: item.UnitPrice,
      }: null)),
      Paid: InvoiceInfo.Paid
    }
    await axios.get(API_URL, {params: RequestParams})
      .then((response) => {
        if (!response.data.StatusCode){
          setUpdateTab(UpdateTab + 1);
        } else if (response.data.StatusCode === 6){
          InsufficientQuantityProducts.current = response.data.ProductsIDs;
          fetchExistingQuantites(ItemsList);
          setSubmiting(false);
          alert("كميات غير متوفرة");
        }else{
          setSubmiting(false);
          console.log(response.data);
        }
      })
      .catch((error) => {
        setSubmiting(false);
        console.log(error)
      })
  }

  useEffect(() => {
    InvoiceInfo.TotalPrice = ItemsList.reduce((acc, item) => acc + (Number(item.Price)),0);
    InvoiceInfo.TransferredToAccount = InvoiceInfo.TotalPrice - InvoiceInfo.Paid;
  }, [ItemsList]);
    
  return(
    <div className='Form-container'>
      <div className="Form">
        <div>
          <button className="Form-close" onClick={() => setOpendForm("")}>X</button>
        </div>
        <div>
          <div>
            <label>اسم العميل</label>
            <input type="text" 
              onChange={(event) =>{
                setInvoiceInfo({
                  ...InvoiceInfo,
                  SellerName: event.target.value
                });
              }}
            />
          </div>
        </div>
        <div>
          <table className='Table InputTable'>
            <thead>
              <tr>
                <th>م</th>
                <th>اسم المنتج</th>
                <th>العلامة التجارية</th>
                <th>بلد التصنيع</th>
                <th>الكود</th>
                <th>الكمية</th>
                <th>الوحدة</th>
                <th>سعر الوحدة</th>
                <th>السعر</th>
              </tr>
            </thead>
            <tbody>
              {ItemsList.map((item, index) => (
                <InvoiceItem 
                  ItemsList={ItemsList}
                  setItemsList={setItemsList}
                  setSelectedItemIndex={setSelectedItemIndex}
                  ExistingQuantities={ExistingQuantities.current}
                  isQuantitySufficient={!InsufficientQuantityProducts.current.some((product) => Number(product) === item.ProductID)}
                  Index={index}
                  ValidationChecker={ValidationChecker}
                  setValidationChecker={setValidationChecker}
                />
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <ItemsListEditor
            ItemsList={ItemsList}
            setItemsList={setItemsList}
            ExistingQuantities={ExistingQuantities.current}
            SelectedItemIndex={SelectedItemIndex}
            setSelectedItemIndex={setSelectedItemIndex}
            ValidationChecker={ValidationChecker}
            setValidationChecker={setValidationChecker}
            ItemFieldsStructure={{
              ProductName: "",
              ProductID: "",
              Trademark: "",
              ManufactureCountry: "",
              Quantity: "",
              QuantityUnit: "",
              UnitPrice: "",
              Price: ""
            }} 
          />
        </div>
        <div>
          <div>
            <label>اجمالي المبلغ</label>
            <input type="number"
              value={InvoiceInfo.TotalPrice} 
              readOnly
            />
          </div>
          <div>
            <label>المدفوع</label>
            <input
              type="number"
              className={InvoiceInfo.Paid > InvoiceInfo.TotalPrice || InvoiceInfo.Paid < 0 ? "Invalid-field-data" : ""}
              value={InvoiceInfo.Paid}
              onChange={(event) => {
                setInvoiceInfo({
                  ...InvoiceInfo,
                  Paid: event.target.value,
                  TransferredToAccount: InvoiceInfo.TotalPrice - event.target.value
                });
              }}
            />
          </div>
          <div>
            <label>محول لحساب الدين</label>
            <input
              type="number"
              className={InvoiceInfo.TransferredToAccount > InvoiceInfo.TotalPrice || InvoiceInfo.TransferredToAccount < 0 ? "Invalid-field-data" : ""}
              value={InvoiceInfo.TransferredToAccount}
              onChange={(event) => {
                setInvoiceInfo({
                  ...InvoiceInfo,
                  TransferredToAccount: event.target.value,
                  Paid: InvoiceInfo.TotalPrice - event.target.value
                });
              }}
            />
          </div>
        </div>
        <div>
          <button
            className="Form-submit"
            onClick={(event) => createInvoice(event)}
            disabled={
              Submiting || ValidationChecker.includes(false) || !ValidationChecker.includes(true) || InvoiceInfo.SellerName === "" || InvoiceInfo.Paid === "" ||
              InvoiceInfo.TransferredToAccount === "" || InvoiceInfo.Paid > InvoiceInfo.TotalPrice || InvoiceInfo.TransferredToAccount > InvoiceInfo.TotalPrice
            }
          >إنشاء</button>
        </div>
      </div>
    </div>
  )
}

function EditInvoiceForm(){
  const { ProjectID, StoreID } = useContext(GlobalContext);
  const { UpdateTab, setUpdateTab, setOpendForm, SelectedRow } = useContext(SellingTabContext);
  const [ Loading , setLoading ] = useState(true);
  const [ Submiting, setSubmiting ] = useState(false);
  const [ InvoiceInfo, setInvoiceInfo ] = useState({
    SellerName: "",
    TotalPrice: "",
    Paid: "",
    TransferredToAccount: ""
  });
  const [ ItemsList, setItemsList ] = useState(Array.from({ length: 12 }, () => ({
    ProductName: "",
    ProductID: "",
    Trademark: "",
    ManufactureCountry: "",
    Quantity: "",
    QuantityUnit: "",
    UnitPrice: "",
    Price: ""
  })));
  const [ ValidationChecker, setValidationChecker ] = useState(Array.from({ length: 12 }, () => undefined));
  const [ SelectedItemIndex, setSelectedItemIndex ] = useState(null);
  const ExistingQuantities = useRef([]);
  const InsufficientQuantityProducts = useRef([]);

  const fetchInvoice = async () => {
    var RequestParams = {
      RequestType: "GetInvoice",
      InvoiceType: "Selling",
      ProjectID: ProjectID,
      InvoiceID: SelectedRow.current.children[1].innerText
    }
    await axios.get(API_URL, {params: RequestParams})
      .then((response) => {
        if (!response.data.StatusCode){
          let NewItemsList = Array.from({ length: 12 }, () => ({
            ProductName: "",
            ProductID: "",
            Trademark: "",
            ManufactureCountry: "",
            Quantity: "",
            QuantityUnit: "",
            UnitPrice: "",
            Price: ""
          }));
          response.data.Data.Items.forEach((item, index) => {
            NewItemsList[index] = {
              ProductName: item.Product_ID__Product_Name,
              ProductID: item.Product_ID__Product_ID,
              Trademark: item.Product_ID__Trademark,
              ManufactureCountry: item.Product_ID__Manufacture_Country,
              Quantity: item.Quantity,
              QuantityUnit: item.Product_ID__Quantity_Unit,
              UnitPrice: item.Unit_Price,
              Price: item.Quantity * item.Unit_Price
            }
          });
          setItemsList(NewItemsList);
          setValidationChecker(Array.from({ length: 12 }, (_, index) => index < response.data.Data.Items.length ? true : undefined));
          setInvoiceInfo({
            InvoiceID: response.data.Data.Invoice_ID,
            ClientName: response.data.Data.Client_Name,
            TotalPrice: response.data.Data.Total_Price,
            Paid: response.data.Data.Paid,
            TransferredToAccount: response.data.Data.Transferred_To_Account
          });
          fetchExistingQuantites(NewItemsList);
        }else{
          console.log(response.data);
          setLoading("error");
        }
      })
      .catch((error) => {
        console.log(error);
        setLoading("error");
      })
  }

  const fetchExistingQuantites = async (NewItemsList) => {
    let RequestParams = {
      RequestType: "GetProductsQuantities",
      ProjectID: ProjectID,
      StoreID: StoreID,
    }
    let ProductIDs = NewItemsList.map((item) => item.ProductID);
    for (let i = 0; i < ProductIDs.length; i++){
      RequestParams[`ProductsIDs[${i}]`] = ProductIDs[i] ? ProductIDs[i] : undefined;
    }
    await axios.get(API_URL, {params: RequestParams})
      .then((response) => {
        if (!response.data.StatusCode){
          ExistingQuantities.current = response.data.Data;
          setLoading(false)
        }else{
          console.log(response.data);
          setLoading("error")
        }
      })
      .catch((error) => {
        console.log(error);
        setLoading("error");
      })
  }

  const editInvoice = async () => {
    setSubmiting(true);
    var RequestParams = {
      RequestType: "EditSellingInvoice",
      ProjectID: ProjectID,
      InvoiceID: InvoiceInfo.InvoiceID,
      ClientName: InvoiceInfo.ClientName,
      Orders: ItemsList.map((item) => (item.ProductID !== "" && item.Quantity !== "" && item.UnitPrice !== "" ? {
        ProductID: item.ProductID,
        Quantity: item.Quantity,
        UnitPrice: item.UnitPrice,
      }: null)),
      Paid: InvoiceInfo.Paid
    }
    await axios.get(API_URL, {params: RequestParams})
      .then((response) => {
        if (!response.data.StatusCode){
          setUpdateTab(UpdateTab + 1);
        } else if (response.data.StatusCode === 6){
          InsufficientQuantityProducts.current = response.data.ProductsIDs;
          fetchExistingQuantites(ItemsList);
          setSubmiting(false);
          alert("كميات غير متوفرة");
        }else{
          setSubmiting(false);
          console.log(response.data);
        }
      })
      .catch((error) => {
        setSubmiting(false);
        console.log(error)
      })
  }
  
  useEffect(() => {
    InvoiceInfo.TotalPrice = ItemsList.reduce((acc, item) => acc + (Number(item.Price)),0);
    InvoiceInfo.TransferredToAccount = InvoiceInfo.TotalPrice - InvoiceInfo.Paid;
  }, [ItemsList]);

  useEffect(() => {
    fetchInvoice();
  },[])

  return(
    <div className='Form-container'>
      <div className="Form">
        <div>
          <button className="Form-close" onClick={(event) => setOpendForm("")}>X</button>
        </div>
        {Loading === false?
          <>
          <div>
            <div>
              <label>الكود</label>
              <input type="text" value={InvoiceInfo.InvoiceID} readOnly />
            </div>
            <div>
              <label>اسم العميل</label>
              <input type="text" 
                value={InvoiceInfo.ClientName}
                onChange={(event) =>{
                  setInvoiceInfo({
                    ...InvoiceInfo,
                    ClientName: event.target.value
                  });
                }}
              />
            </div>
          </div>
          <div>
            <table className='Table InputTable'>
              <thead>
                <tr>
                  <th>م</th>
                  <th>اسم المنتج</th>
                  <th>العلامة التجارية</th>
                  <th>بلد التصنيع</th>
                  <th>الكود</th>
                  <th>الكمية</th>
                  <th>الوحدة</th>
                  <th>سعر الوحدة</th>
                  <th>السعر</th>
                </tr>
              </thead>
              <tbody>
                {ItemsList.map((item, index) => (
                  <InvoiceItem
                    ItemsList={ItemsList}
                    setItemsList={setItemsList}
                    setSelectedItemIndex={setSelectedItemIndex} 
                    ExistingQuantities={ExistingQuantities.current}
                    isQuantitySufficient={!InsufficientQuantityProducts.current.some((product) => Number(product) === item.ProductID)}
                    Index={index}
                    ValidationChecker={ValidationChecker}
                    setValidationChecker={setValidationChecker}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <ItemsListEditor
              ItemsList={ItemsList}
              setItemsList={setItemsList}
              ExistingQuantities={ExistingQuantities.current}
              SelectedItemIndex={SelectedItemIndex}
              ValidationChecker={ValidationChecker}
              setValidationChecker={setValidationChecker}
              ItemFieldsStructure={{
                ProductName: "",
                ProductID: "",
                Trademark: "",
                ManufactureCountry: "",
                Quantity: "",
                QuantityUnit: "",
                UnitPrice: "",
                Price: ""
              }} 
            />
          </div>
          <div>
            <div>
              <label>اجمالي المبلغ</label>
              <input type="number" value={InvoiceInfo.TotalPrice} readOnly/>
            </div>
            <div>
              <label>المدفوع</label>
              <input
                type="number"
                className={InvoiceInfo.Paid > InvoiceInfo.TotalPrice || InvoiceInfo.Paid < 0 ? "Invalid-field-data" : ""}
                value={InvoiceInfo.Paid}
                onChange={(event) => {
                  setInvoiceInfo({
                    ...InvoiceInfo,
                    Paid: event.target.value,
                    TransferredToAccount: InvoiceInfo.TotalPrice - event.target.value
                  });
                }}
              />
            </div>
            <div>
              <label>محول لحساب الدين</label>
              <input
                type="number"
                className={InvoiceInfo.TransferredToAccount > InvoiceInfo.TotalPrice || InvoiceInfo.TransferredToAccount < 0 ? "Invalid-field-data" : ""}
                value={InvoiceInfo.TransferredToAccount}
                onChange={(event) => {
                  setInvoiceInfo({
                    ...InvoiceInfo,
                    TransferredToAccount: event.target.value,
                    Paid: InvoiceInfo.TotalPrice - event.target.value
                  });
                }}
              />
            </div>
          </div>
          <div>
            <button
              className="Form-submit"
              onClick={() => editInvoice()}
              disabled={
                Submiting || ValidationChecker.includes(false) || !ValidationChecker.includes(true) || InvoiceInfo.ClientName === "" || InvoiceInfo.Paid === "" ||
                InvoiceInfo.TransferredToAccount === "" || InvoiceInfo.Paid > InvoiceInfo.TotalPrice || InvoiceInfo.TransferredToAccount > InvoiceInfo.TotalPrice
              }
            >تعديل</button>
          </div>
        </>
      : Loading === "error"? "error" : "loading..."}
      </div>
    </div>
  )
}

function SellingInvoicesTableBody(){
  const { InvoicesList, SelectedRow, EditInvoiceButtonRef, DeleteInvoiceButtonRef, PrintInvoiceButtonRef } = useContext(SellingTabContext);
  const selectRow = (event) => {
    if (SelectedRow.current){SelectedRow.current.classList.remove("Selected-row");}
    SelectedRow.current = event.currentTarget;
    SelectedRow.current.classList.add("Selected-row");
    EditInvoiceButtonRef.current.disabled = false;
    DeleteInvoiceButtonRef.current.disabled = false;
    PrintInvoiceButtonRef.current.disabled = false;
  }

  return (
    InvoicesList.map((invoice, index) => (
      <tr onClick={(event)=>selectRow(event)}>
        <td>{index + 1}</td>
        <td>{invoice.Invoice_ID}</td>
        <td>{invoice.Client_Name}</td>
        <td>{invoice.DateTime}</td>
        <td>{invoice.Total_Price}</td>
        <td>{invoice.Paid}</td>
        <td>{invoice.Transferred_To_Debt_Account}</td>
      </tr>
    ))
  );
}
export default SellingTabContent;