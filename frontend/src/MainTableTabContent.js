import { useState, useEffect, useRef, createContext, useContext } from 'react';

function MainTableTabContent({OpenedTabs, setOpenedTabs, openTab}) {

  return (
    <div className="Main-tab-content">
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

export default MainTableTabContent;