import { useState, useEffect, useRef, createContext, useContext } from 'react';
import { TabPanel } from 'react-tabs';
import axios from 'axios';
import { GlobalContext } from './App.js';
import { TabContext } from './UiComponents/Tabs.js';

function MainTableTabContent(){
  const { OpenedTabs, setOpenedTabs } = useContext(TabContext);
  const handleOpenTab = (index) => {
    const NewOpenedTabs = [...OpenedTabs];
    NewOpenedTabs[index] = true;
    setOpenedTabs(NewOpenedTabs);
  };

  return (
    <div className="Main-tab-content">
      <div className="Tiles-container">
        <button className="Tile" onClick={() => handleOpenTab(1)}>فواتير البيع</button>
        <button className="Tile" onClick={() => handleOpenTab(2)}>فواتير الشراء</button>
        <button className="Tile" onClick={() => handleOpenTab(3)}>التحويلات</button>
        <button className="Tile" onClick={() => handleOpenTab(4)}>المنتجات</button>
        <button className="Tile" onClick={() => handleOpenTab(5)}>حسابات الديون</button>
        <button className="Tile" onClick={() => handleOpenTab(6)}>تعديل الكميات</button>
      </div>
    </div>
  );
}

export default MainTableTabContent;