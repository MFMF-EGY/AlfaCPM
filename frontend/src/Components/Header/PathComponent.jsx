import { useContext } from 'react';
import { GlobalContext } from '../../App.jsx';
import styles from "./PathComponent.module.css";

export default function PathComponent() {
  const { ProjectID, setProjectID, ProjectInfo, StoreID, setStoreID, StoreInfo } =
    useContext(GlobalContext);
  return (
    <div className={styles.PathComponent}>
      <a onClick={()=>{
        setProjectID(null);
        setStoreID(null)
      }}>المشروعات</a>
      {ProjectID && 
        <>
          <span> / </span>
          <a onClick={()=>{            setStoreID(null)
          }}>{ProjectInfo?.Project_Name}</a>
        </>
      }
      {StoreID && 
        <>
          <span> / </span>
          <a>{StoreInfo?.Store_Name}</a>
        </>
      }
    </div>
  )
}