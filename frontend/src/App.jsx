import { useState, useEffect, useRef, createContext, useContext } from 'react';
import { Tabs, Tab } from "./UiComponents/Tabs.jsx";
import './App.css';
import axios from 'axios';
import ProfileDropdownComponent from './Components/Header/ProfileDropdownComponent.jsx';
import { CreateProjectForm, CreateStoreForm } from './Components/MainPage/MainPageComponent.jsx'
import LoginFormComponent from './Components/Login/LoginFormComponent.jsx';
import MainPageComponent from './Components/MainPage/MainPageComponent.jsx';
import RegisterationFormComponent from './Components/Login/RegistrationFormComponent.jsx';
import MainTableTabContent from './MainTableTabContent.jsx';
import ProductsTabContent from './ProductsTabContent.jsx';
import SellingTabContent from './SellingTabContent.jsx';
import PurchaseTabContent from './PurchaseTabContent.jsx';
import TransitionTabContent from './TransitionTabContent.jsx';
import DebtsAccountsTabContent from './DebtsAccountsTabContent.jsx';
import QuantityAdjustmentsTabContent from './QuantityAdjustmentsTabContent.jsx';
import PathComponent from './Components/Header/PathComponent.jsx';

export const COMMERCIAL_API_URL = window.location.protocol + '//' + window.location.hostname + ':8000/apis/v1.0/commercial';
export const AUTH_API_URL = window.location.protocol + '//' + window.location.hostname + ':8000/apis/v1.0/auth';
export const GlobalContext = createContext();

function App() {
  const [ ProjectID, setProjectID] = useState(null);
  const [ StoreID, setStoreID ] = useState(null);
  const [ ProjectInfo, setProjectInfo ] = useState(null);
  const [ StoreInfo, setStoreInfo ] = useState(null);
  const [ FormSelector, setFormSelector] = useState(null);
  const [ user, setUser ] = useState(undefined);
  const [ refreshToken, setRefreshToken ] = useState(null);
  const [ isLoading, setIsLoading ] = useState(true);
  const [ projectsChanged, setProjectsChanged ] = useState(false);
  const [ storesChanged, setStoresChanged ] = useState(false);

  useEffect(() => {
    if (user === null || typeof user === Object) {
      setIsLoading(true);
    }
  },[user])

  return (
    <GlobalContext.Provider
      value={{
        StoreID,
        setStoreID,
        ProjectID,
        setProjectID,
        ProjectInfo,
        setProjectInfo,
        StoreInfo,
        setStoreInfo,
        user,
        setUser,
        refreshToken,
        setRefreshToken,
        isLoading,
        setIsLoading,
        setFormSelector
      }}
    >
      <div className="App">
        <header className="App-header">
          <ProfileDropdownComponent />
          <PathComponent />
        </header>
        <main>

          {ProjectID && StoreID ? (
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
          ) : <MainPageComponent projectsChanged={projectsChanged} storesChanged={storesChanged} />}

          {FormSelector === "CreateProjectForm" && <CreateProjectForm projectsChanged={projectsChanged} setProjectsChanged={setProjectsChanged} />}
          {FormSelector === "CreateStoreForm" && <CreateStoreForm storesChanged={storesChanged} setStoresChanged={setStoresChanged} />}
          {FormSelector === "LoginForm" && <LoginFormComponent 
            onLoginSuccess={(token) => {
              setRefreshToken(token);
              setFormSelector("");
            }}
          />}
          {FormSelector === "RegisterForm" && <RegisterationFormComponent />}
        </main>
      </div>
    </GlobalContext.Provider>
  );
}


function ProjectStoreSelect({ storesChanged }) {
  const { ProjectID, setProjectID } = useContext(GlobalContext);
  const { StoreID, setStoreID } = useContext(GlobalContext);
  const { isLoading, setIsLoading, setFormSelector } = useContext(GlobalContext);
  const [ projects, setProjects ] = useState([]);
  const [ stores, setStores ] = useState([]);

  const fetchProjects = async () => {
    try {
      const response = await axios.get(COMMERCIAL_API_URL + '?RequestType=GetProjects');
      if (!response.data.StatusCode) {
        setProjects(response.data.Data);
        setIsLoading(false);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const fetchStores = async () => {
    if (ProjectID) {
      try {
        const response = await axios.get(COMMERCIAL_API_URL + "?RequestType=GetStores&ProjectID="+ProjectID);
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

  useEffect(() => {
    fetchProjects();
  }, [isLoading === true]);

  useEffect(() => {
    fetchStores();
  }, [ProjectID, storesChanged]);
  
  return (
    <div>
      <select id="Project-select" defaultValue={""} onChange={(event) => {selectProject(event)}}>
        <option value="" disabled hidden>اختر مشروع</option>
        {projects.map((project) => (
          <option key={project.Project_ID} value={project.Project_ID}>{project.Project_Name}</option>
        ))}
      </select>
      <button onClick={() => {setFormSelector("CreateProjectForm")}}>إنشاء مشروع</button>
      { ProjectID && (
        <>
        <select id="Store-select" value={StoreID ? StoreID : ""} onChange={(event) => {setStoreID(event.target.value)}}>
          <option value="" disabled hidden>اختر مخزن</option>
          {stores.map((store) => (
            <option key={store.Store_ID} value={store.Store_ID}>{store.Store_Name}</option>
          ))}
        </select>
        <button onClick={() => {setFormSelector("CreateStoreForm")}}>أضف مخزن</button>
        </>
      )}
      
    </div>
  );
};

// function CreateProjectForm(){
//   const { setFormSelector, setIsLoading, refreshToken } = useContext(GlobalContext);
//   const [ Submiting, setSubmiting ] = useState(false);
//   const ProjectNameRef = useRef();
//   const ProjectDescriptionRef = useRef()
//   const createProject = async () => {
//     setSubmiting(true);
//     var RequestParms = {
//       RequestType: "CreateProject",
//       ProjectName: ProjectNameRef.current.value,
//       ProjectDescription: ProjectDescriptionRef.current.value,
//       RefreshToken: refreshToken
//     }
//     await axios.get(COMMERCIAL_API_URL,{params: RequestParms})
//     .then((response) => {
//       if (!response.data.StatusCode){
//         setFormSelector("");
//         setIsLoading(true);
//       } else {
//         setSubmiting(false);
//         console.log(response.data);
//       }
//     })
//     .catch((error) => {
//       setSubmiting(false);
//       console.log(error);
//     })
//   }
//   return(
//     <div className='Form-container'>
//       <div className="Form">
//         <div>
//           <button className="Form-close" onClick={() => setFormSelector("")}>X</button>
//         </div>
//         <div>
//           <label>اسم المشروع</label>
//           <input type="text" ref={ProjectNameRef}></input>
//         </div>
//         <div>
//           <label>الوصف</label>
//           <input type="text" ref={ProjectDescriptionRef}></input>
//         </div>
//         <div>
//           <button onClick={() => createProject()} disabled={Submiting}>إنشاء</button>
//         </div>
//       </div>
//     </div>
//   );
// }

// function CreateStoreForm({ storesChanged, setStoresChanged }){
//   const { setFormSelector } = useContext(GlobalContext);
//   const { ProjectID, setProjectID } = useContext(GlobalContext);
//   const [ Submiting, setSubmiting ] = useState(false);
//   const StoreNameRef = useRef();
//   const StoreAddressRef = useRef();
//   const addStore = async () => {
//     setSubmiting(true);
//     var RequestParms = {
//       RequestType: "AddStore",
//       ProjectID: ProjectID,
//       StoreName: StoreNameRef.current.value,
//       StoreAddress: StoreAddressRef.current.value
//     }
//     await axios.get(COMMERCIAL_API_URL,{params: RequestParms})
//     .then((response) => {
//       if (!response.data.StatusCode){
//         setFormSelector("");
//         setStoresChanged(!storesChanged);
//       }else{
//         setSubmiting(false);
//         console.log(response.data);
//       }
//     })
//     .catch((error) => console.log(error))
//   }
//   return(
//     <div className='Form-container'>
//       <div className="Form">
//         <div>
//           <button className="Form-close" onClick={() => setFormSelector("")}>X</button>
//         </div>
//         <div>
//           <label>اسم المخزن</label>
//           <input type="text" ref={StoreNameRef}></input>
//         </div>
//         <div>
//           <label>العنوان</label>
//           <input type="text" ref={StoreAddressRef}></input>
//         </div>
//         <div>
//           <button onClick={() => addStore()} disabled={Submiting}>إنشاء</button>
//         </div>
//       </div>
//     </div>
//   );
// }
export default App;
