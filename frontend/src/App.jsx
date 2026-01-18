import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import { Tabs, Tab } from "./UiComponents/Tabs.jsx";
import './App.css';
import axios from 'axios';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import MainTableTabContent from './MainTableTabContent.jsx';
import ProductsTabContent from './ProductsTabContent.jsx';
import SellingTabContent from './SellingTabContent.jsx';
import PurchaseTabContent from './PurchaseTabContent.jsx';
import TransitionTabContent from './TransitionTabContent.jsx';
import DebtsAccountsTabContent from './DebtsAccountsTabContent.jsx';
import QuantityAdjustmentsTabContent from './QuantityAdjustmentsTabContent.jsx';

export const API_URL = window.location.protocol+'//'+window.location.hostname+':8000/apis/v1.0/commercial';
export const GlobalContext = createContext();
const FormsContext = createContext();

function App() {
  const [ ProjectID, setProjectID] = useState(null);
  const [ StoreID, setStoreID ] = useState(null);
  const [ FormSelector, setFormSelector] = useState(null);
  const [ ProjectStoreChanged, setProjectStoreChanged ] = useState(false);
  const [ TabNames, setTabNames ] = useState(["MainTableTab"]);
  const [ user, setUser ] = useState(null);
  const [ isLoading, setIsLoading ] = useState(true);

  // Check for stored user session on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('googleUser');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('googleUser');
      }
    }
    setIsLoading(false);
  }, []);

  const handleLoginSuccess = (credentialResponse) => {
    console.log(credentialResponse);
    // Store user data in localStorage
    localStorage.setItem('googleUser', JSON.stringify(credentialResponse));
    setUser(credentialResponse);
  };

  const handleLogout = () => {
    localStorage.removeItem('googleUser');
    setUser(null);
  };

  if (isLoading) {
    return <div className="App"><div>Loading...</div></div>;
  }

  return (
    <GoogleOAuthProvider clientId="417283093219-tq3ucsnemrskhnp8eavql9bjjrmq775t.apps.googleusercontent.com">
      <GlobalContext.Provider
        value={{
          StoreID,
          setStoreID,
          ProjectID,
          setProjectID,
          Tabs: TabNames,
          setTabs: setTabNames,
          user,
          setUser,
          handleLogout,
        }}
      >
        <div className="App">
          <header className="App-header">
            <ProjectStoreSelect
              value={ProjectStoreChanged}
              GlobalContext={{ ProjectID, setProjectID, StoreID, setStoreID }}
              setFormSelector={setFormSelector}
            />
            {user ? (
              <div className="user-info">
                <span>Welcome, {user.credential ? 'User' : 'Guest'}</span>
                <button onClick={handleLogout}>Logout</button>
              </div>
            ) : (
              <GoogleLogin
                onSuccess={handleLoginSuccess}
                onError={() => {
                  console.log('Login Failed');
                }}
              />
            )}
          </header>
          <main>
            {ProjectID && StoreID && (
              <Tabs>
                <Tab title="القائمة الرئيسية" closable={false} opened={true}>
                  <MainTableTabContent />
                </Tab>
                <Tab title="فواتير البيع" closable={true}>
                  <SellingTabContent />
                </Tab>
                <Tab title="فواتير الشراء" closable={true}>
                  <PurchaseTabContent />
                </Tab>
                <Tab title="التحويلات" closable={true}>
                  <TransitionTabContent />
                </Tab>
                <Tab title="المنتجات" closable={true}>
                  <ProductsTabContent />
                </Tab>
                <Tab title="حسابات الديون" closable={true}>
                  <DebtsAccountsTabContent />
                </Tab>
                <Tab title="تعديلات الكميات" closable={true}>
                  <QuantityAdjustmentsTabContent />
                </Tab>
              </Tabs>
            )}
            <FormsContext.Provider
              value={{
                FormSelector,
                setFormSelector,
                ProjectStoreChanged,
                setProjectStoreChanged,
              }}
            >
              {FormSelector === "CreateProjectForm" && <CreateProjectForm />}
              {FormSelector === "CreateStoreForm" && <CreateStoreForm />}
            </FormsContext.Provider>
          </main>
        </div>
      </GlobalContext.Provider>
    </GoogleOAuthProvider>
  );
}


const ProjectStoreSelect = React.memo(({ ProjectStoreChanged, GlobalContext, setFormSelector }) =>{
  const { ProjectID, setProjectID } = GlobalContext
  const { StoreID, setStoreID } = GlobalContext;
  const [projects, setProjects] = useState([]);
  const [stores, setStores] = useState([]);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await axios.get(API_URL + '?RequestType=GetProjects');
        if (!response.data.StatusCode) {
          setProjects(response.data.Data);
        }
      } catch (error) {
        console.log(error);
      }
    };
    fetchProjects();
  }, [ProjectStoreChanged]);

  useEffect(() => {
    fetchStores();
  }, [ProjectStoreChanged, ProjectID]);

  const fetchStores = async () => {
    if (ProjectID) {
      try {
        const response = await axios.get(API_URL + "?RequestType=GetStores&ProjectID="+ProjectID);
        if (!response.data.StatusCode) {
          setStores(response.data.Data);
        }
      } catch (error) {
        console.log(error);
      }
    }
  };
  
  const selectProject = (event) => {
    setProjectID(event.target.value);
    setStoreID(null);
  }
  
  return(
    <div>
      <select id="Project-select" defaultValue={""} onChange={(event) => {selectProject(event)}}>
        <option value="" disabled hidden>اختر مشروع</option>
        {projects.map((project) => (
          <option key={project.Project_ID} value={project.Project_ID}>{project.Project_Name}</option>
        ))}
      </select>
      <button onClick={(event) => {setFormSelector("CreateProjectForm")}}>إنشاء مشروع</button>
      { ProjectID && (
        <>
        <select id="Store-select" value={StoreID ? StoreID : ""} onChange={(event) => {setStoreID(event.target.value)}}>
          <option value="" disabled hidden>اختر مخزن</option>
          {stores.map((store) => (
            <option key={store.Store_ID} value={store.Store_ID}>{store.Store_Name}</option>
          ))}
        </select>
        <button onClick={(event) => {setFormSelector("CreateStoreForm")}}>أضف مخزن</button>
        </>
      )}
      
    </div>
  );
}, (prevProps, nextProps) => prevProps.value === nextProps.value && prevProps.GlobalContext === nextProps.GlobalContext);

function CreateProjectForm(){
  const { setFormSelector } = useContext(FormsContext);
  const { ProjectStoreChanged, setProjectStoreChanged } = useContext(FormsContext);
  const [ Submiting, setSubmiting ] = useState(false);
  const ProjectNameRef = useRef();
  const ProjectDescriptionRef = useRef()
  const createProject = async () => {
    setSubmiting(true);
    var RequestParms = {
      RequestType: "CreateProject",
      ProjectName: ProjectNameRef.current.value,
      ProjectDescription: ProjectDescriptionRef.current.value
    }
    await axios.get(API_URL,{params: RequestParms})
    .then((response) => {
      if (!response.data.StatusCode){
        setFormSelector("");
        setProjectStoreChanged(!ProjectStoreChanged);
      } else {
        setSubmiting(false);
        console.log(response.data);
      }
    })
    .catch((error) => {
      setSubmiting(false);
      console.log(error);
    })
  }
  return(
    <div className='Form-container'>
      <div className="Form">
        <div>
          <button className="Form-close" onClick={() => setFormSelector("")}>X</button>
        </div>
        <div>
          <label>اسم المشروع</label>
          <input type="text" ref={ProjectNameRef}></input>
        </div>
        <div>
          <label>الوصف</label>
          <input type="text" ref={ProjectDescriptionRef}></input>
        </div>
        <div>
          <button onClick={() => createProject()} disabled={Submiting}>إنشاء</button>
        </div>
      </div>
    </div>
  );
}

function CreateStoreForm(){
  const { setFormSelector } = useContext(FormsContext);
  const { ProjectStoreChanged, setProjectStoreChanged } = useContext(FormsContext);
  const { ProjectID, setProjectID } = useContext(GlobalContext);
  const [ Submiting, setSubmiting ] = useState(false);
  const StoreNameRef = useRef();
  const StoreAddressRef = useRef();
  const addStore = async () => {
    setSubmiting(true);
    var RequestParms = {
      RequestType: "AddStore",
      ProjectID: ProjectID,
      StoreName: StoreNameRef.current.value,
      StoreAddress: StoreAddressRef.current.value
    }
    await axios.get(API_URL,{params: RequestParms})
    .then((response) => {
      if (!response.data.StatusCode){
        setFormSelector("");
        setProjectStoreChanged(!ProjectStoreChanged);
      }else{
        setSubmiting(false);
        console.log(response.data);
      }
    })
    .catch((error) => console.log(error))
  }
  return(
    <div className='Form-container'>
      <div className="Form">
        <div>
          <button className="Form-close" onClick={() => setFormSelector("")}>X</button>
        </div>
        <div>
          <label>اسم المخزن</label>
          <input type="text" ref={StoreNameRef}></input>
        </div>
        <div>
          <label>العنوان</label>
          <input type="text" ref={StoreAddressRef}></input>
        </div>
        <div>
          <button onClick={() => addStore()} disabled={Submiting}>إنشاء</button>
        </div>
      </div>
    </div>
  );
}
export default App;
