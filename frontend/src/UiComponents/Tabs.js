import React, { useState } from "react";
const Tabs = ({ children }) => {
  const [ activeTab, setActiveTab ] = useState(0);
  const [ OpenedTabs, setOpenedTabs ] = useState(
    React.Children.map(children, (child) => child.props.opened || false)
  );
  
  const openTab = (index) => {
    const openedTabsCopy = [...OpenedTabs];
    openedTabsCopy[index] = true;
    setOpenedTabs(openedTabsCopy);
    setActiveTab(index);
  };

  const closeTab = (index) => {
    const openedTabsCopy = [...OpenedTabs];
    openedTabsCopy[index] = false;
    setOpenedTabs(openedTabsCopy);
    if (index === activeTab && openedTabsCopy.some((tab) => tab)) {
      if (index !== tabs.length - 1){
        index += 1;
      }
      while (openedTabsCopy[index] === false) {
        index -= 1;
      }
      setActiveTab(index);
    }
  };
  
  const tabs = React.Children.map(children, (child) =>
    React.cloneElement(child, { OpenedTabs, setOpenedTabs, openTab, closeTab, ...child.props })
  );

  return (
    <div style={{ height: "100%" }}>
      <ul className="Tabs-bar">
        {tabs.map((tab, index) => (
          OpenedTabs[index] && (
            <li
              key={index}
              className={`Tab ${index === activeTab ? "Active-tab" : ""}`}
              style={{ justifyContent: !tab.props.closable && "space-around" }}
              onClick={() => setActiveTab(index)}
            >
              {tab.props.title}
              {tab.props.closable && (
                <button
                  className="Tab-close"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(index);
                  }}
                >
                  X
                </button>
              )}
            </li>
          )
        ))}
      </ul>
      <div className="Tab-content">
        {tabs.map((tab, index) => (
          OpenedTabs[index] && (
            <div
              key={index}
              style={{
                width: "100%",
                height: "100%",
                display: index === activeTab ? "block" : "none"
              }}
            >
              {tab}
            </div>
          )
        ))}
      </div>
    </div>
  );
};

const Tab = ({ OpenedTabs, setOpenedTabs, openTab, closeTab, children }) => {
  return (
    <>
      {React.cloneElement(children, { OpenedTabs, setOpenedTabs, openTab, closeTab })}
    </>
  );
};

export { Tabs, Tab };