import { useState, useEffect, useContext, useRef } from "react";
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import SectionHeader from "@/UiComponents/SectionHeader";
import { GlobalContext } from "@/App";
import axios from "axios";
import styles from "./MainPageComponent.module.css";
import { COMMERCIAL_API_URL } from "@/App";
import addIcon from '@/assets/plus-square-dotted.svg';

export default function MainPageComponent({ openTab }) {
  const { 
    refreshToken,
    setProjectInfo,
    ProjectID,
    setProjectID,
    setStoreInfo,
    StoreID,
    setStoreID,
  } = useContext(GlobalContext)
  const [ projects, setProjects ] = useState([]);
  const [ stores, setStores ] = useState([]);
  const [ isLoading, setIsLoading ] = useState(true);
  const [ projectsChanged, setProjectsChanged ] = useState(false);
  const [ storesChanged, setStoresChanged ] = useState(false);
  const [ openedForm, setOpenedForm ] = useState("");
  
  const fetchProjects = async () => {
    try {
      const response = await axios.get(COMMERCIAL_API_URL + '?RequestType=GetProjects');
      if (!response.data.StatusCode) {
        setProjects(response.data.Data);
        setIsLoading(false);
      }
    } catch (error) {
      setIsLoading(false);
      console.log(error);
    }
  };

  const fetchStores = async () => {
    try {
      const response = await axios.get(COMMERCIAL_API_URL + "?RequestType=GetStores&ProjectID="+ProjectID);
      if (!response.data.StatusCode) {
        setStores(response.data.Data);
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [refreshToken, projectsChanged]);

  useEffect(() => {
    if (ProjectID){
      fetchStores();
    }
  }, [ProjectID, storesChanged]);

  if (!ProjectID){
    return (
      <div>
        <SectionHeader>
          <h3>المشروعات</h3>
        </SectionHeader>
        {refreshToken && 
          <>
            {isLoading ? (
              <p>Loading...</p>
            ) : (
              projects.map((project) => (
                <Card className={styles.ProjectCard} key={project.Project_ID} onClick={() => {
                  setOpenedForm("");
                  setProjectID(project.Project_ID);
                  setProjectInfo(project);
                }}>
                  <CardContent className={styles.ProjectCardContent}>    
                    <h3>{project.Project_Name}</h3>
                    <p>{project.Project_Description}</p>
                  </CardContent>
                </Card>
              ))
            )}
            <Card className={styles.NewProjectCard} onClick={() => setOpenedForm("CreateProjectForm")}>
              <CardContent className={styles.NewProjectCardContent}>
                <img src={addIcon} alt="Add Project" className={styles.AddIcon}/>
                <text>مشروع جديد</text>
              </CardContent>
            </Card>
          </>
        }
        {openedForm === "CreateProjectForm" && <CreateProjectForm projectsChanged={projectsChanged} setProjectsChanged={setProjectsChanged} setOpenedForm={setOpenedForm}/>}
      </div>
    )
  } else if (ProjectID && !StoreID){
    return (
      <div>
        <SectionHeader>
          <h3>المخازن</h3>
        </SectionHeader>
        {refreshToken && 
          <>
            {isLoading ? (
              <p>Loading...</p>
            ) : (
              stores.map((store) => (
                <Card className={styles.ProjectCard} key={store.Store_ID} onClick={() => {
                  setOpenedForm("");
                  setStoreID(store.Store_ID);
                  setStoreInfo(store);
                }}>
                  <CardContent className={styles.ProjectCardContent}>    
                    <h3>{store.Store_Name}</h3>
                    <p>{store.Store_Address}</p>
                  </CardContent>
                </Card>
              ))
            )}
            <Card className={styles.NewProjectCard} onClick={() => setOpenedForm("CreateStoreForm")}>
              <CardContent className={styles.NewProjectCardContent}>
                <img src={addIcon} alt="Add Store" className={styles.AddIcon}/>
                <text>مخزن جديد</text>
              </CardContent>
            </Card>
          </>
        }
        <SectionHeader>
          <h3>الموارد البشرية</h3>
        </SectionHeader>
        <Card className={styles.ProjectCard} onClick={() => openTab(7)}>
          <CardContent className={styles.ProjectCardContent}>    
            <h3>الموظفين</h3>
            <p>إدارة بيانات الموظفين</p>
          </CardContent>
        </Card>
        {openedForm === "CreateStoreForm" && <CreateStoreForm storesChanged={storesChanged} setStoresChanged={setStoresChanged} setOpenedForm={setOpenedForm}/>}
      </div>
    )
  } else if (ProjectID && StoreID){
    return (
      <MainMenu openTab={openTab}/>
    )
  }
}

function MainMenu({ openTab }) {
  return (
    <div>
      <div className="Tiles-container">
        <button className="Tile" onClick={() => openTab(1)}>فواتير البيع</button>
        <button className="Tile" onClick={() => openTab(2)}>فواتير الشراء</button>
        <button className="Tile" onClick={() => openTab(3)}>التحويلات</button>
        <button className="Tile" onClick={() => openTab(4)}>المنتجات</button>
        <button className="Tile" onClick={() => openTab(5)}>حسابات الديون</button>
        <button className="Tile" onClick={() => openTab(6)}>تعديل الكميات</button>
      </div>
    </div>
  );
}

export function CreateProjectForm({ projectsChanged, setProjectsChanged, setOpenedForm }){
  const { setIsLoading, refreshToken } = useContext(GlobalContext);
  const [ Submiting, setSubmiting ] = useState(false);
  const ProjectNameRef = useRef();
  const ProjectDescriptionRef = useRef()
  const createProject = async () => {
    setSubmiting(true);
    var RequestParms = {
      RequestType: "CreateProject",
      ProjectName: ProjectNameRef.current.value,
      ProjectDescription: ProjectDescriptionRef.current.value,
      RefreshToken: refreshToken
    }
    await axios.get(COMMERCIAL_API_URL,{params: RequestParms})
    .then((response) => {
      if (!response.data.StatusCode){
        setOpenedForm("");
        setProjectsChanged(!projectsChanged);
        setIsLoading(true);
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
          <button className="Form-close" onClick={() => setOpenedForm("")}>X</button>
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

export function CreateStoreForm({ storesChanged, setStoresChanged, setOpenedForm }){
  const { ProjectID, refreshToken } = useContext(GlobalContext);
  const [ Submiting, setSubmiting ] = useState(false);
  const StoreNameRef = useRef();
  const StoreAddressRef = useRef();
  const addStore = async () => {
    setSubmiting(true);
    var RequestParms = {
      RequestType: "AddStore",
      ProjectID: ProjectID,
      StoreName: StoreNameRef.current.value,
      StoreAddress: StoreAddressRef.current.value,
      RefreshToken: refreshToken
    }
    await axios.get(COMMERCIAL_API_URL,{params: RequestParms})
    .then((response) => {
      if (!response.data.StatusCode){
        setOpenedForm("");
        setStoresChanged(!storesChanged);
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
          <button className="Form-close" onClick={() => setOpenedForm("")}>X</button>
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