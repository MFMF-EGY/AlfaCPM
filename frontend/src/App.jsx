import { useState, useEffect, useRef, createContext, useContext } from 'react';
import { Tabs, Tab } from "./UiComponents/Tabs.jsx";
import './App.css';
import axios from 'axios';
import ProfileDropdownComponent from './Components/Header/ProfileDropdownComponent.jsx';
import { CreateProjectForm, CreateStoreForm } from './Components/Pages/MainPageComponent.jsx'
import LoginFormComponent from './Components/Login/LoginFormComponent.jsx';
import MainPageComponent from './Components/Pages/MainPageComponent.jsx';
import RegisterationFormComponent from './Components/Login/RegistrationFormComponent.jsx';
import ProductsTabContent from './ProductsTabContent.jsx';
import SellingTabContent from './SellingTabContent.jsx';
import PurchaseTabContent from './PurchaseTabContent.jsx';
import TransitionTabContent from './TransitionTabContent.jsx';
import DebtsAccountsTabContent from './DebtsAccountsTabContent.jsx';
import QuantityAdjustmentsTabContent from './QuantityAdjustmentsTabContent.jsx';
import EmployeesPage from './Components/Pages/EmployeesPageComponent.jsx';
import EmployeePermissionsForm from './Components/Pages/EmployeesPageComponent.jsx';
import PathComponent from './Components/Header/PathComponent.jsx';

const BASE_API_URL = window.location.protocol + '//' + window.location.hostname + ':8000/apis/v1.0';
export const COMMERCIAL_API_URL = `${BASE_API_URL}/commercial`;
export const AUTH_API_URL = `${BASE_API_URL}/auth`;
export const ACCOUNTS_API_URL = `${BASE_API_URL}/accounts`;
export const HR_API_URL = `${BASE_API_URL}/hr`;
export const GlobalContext = createContext();

function App() {
  const [ ProjectID, setProjectID] = useState(null);
  const [ StoreID, setStoreID ] = useState(null);
  const [ ProjectInfo, setProjectInfo ] = useState(null);
  const [ StoreInfo, setStoreInfo ] = useState(null);
  const [ openedForm, setOpenedForm ] = useState(null);
  const [ user, setUser ] = useState(undefined);
  const [ refreshToken, setRefreshToken ] = useState(null);
  const [ isLoading, setIsLoading ] = useState(true);

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
        setFormSelector: setOpenedForm
      }}
    >
      <div className="App">
        <header className="App-header">
          <ProfileDropdownComponent />
          <PathComponent />
        </header>
        <main>
          <Tabs style={{height : '100%'}}>
            <Tab title="القائمة الرئيسية" closable={false} opened={true}>
              <MainPageComponent />
            </Tab>
            <Tab title="فواتير البيع" closable={true} keepOpen={ProjectID !== null && StoreID !== null}>
              <SellingTabContent />
            </Tab>
            <Tab title="فواتير الشراء" closable={true} keepOpen={ProjectID !== null && StoreID !== null}>
              <PurchaseTabContent />
            </Tab>
            <Tab title="التحويلات" closable={true} keepOpen={ProjectID !== null && StoreID !== null}>
              <TransitionTabContent />
            </Tab>
            <Tab title="المنتجات" closable={true} keepOpen={ProjectID !== null && StoreID !== null}>
              <ProductsTabContent />
            </Tab>
            <Tab title="حسابات الديون" closable={true} keepOpen={ProjectID !== null && StoreID !== null}>
              <DebtsAccountsTabContent />
            </Tab>
            <Tab title="تعديلات الكميات" closable={true} keepOpen={ProjectID !== null && StoreID !== null}>
              <QuantityAdjustmentsTabContent />
            </Tab>
            <Tab title="الموظفين" closable={true} keepOpen={ProjectID !== null}>
              <EmployeesPage />
            </Tab>
          </Tabs>
          {openedForm === "LoginForm" && <LoginFormComponent 
            onLoginSuccess={(token) => {
              setRefreshToken(token);
              setOpenedForm("");
            }}
          />}
          {openedForm === "RegisterForm" && <RegisterationFormComponent 
            onLoginSuccess={(token) => {
              setRefreshToken(token);
              setOpenedForm("");
            }}
          />}
        </main>
      </div>
    </GlobalContext.Provider>
  );
}

export default App;
