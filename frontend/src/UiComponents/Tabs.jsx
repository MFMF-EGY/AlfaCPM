import React, { useState, useEffect } from "react";
const Tabs = ({ children, className, style }) => {
  const [ activeTab, setActiveTab ] = useState(0);

  const childElements = React.Children.toArray(children).filter((child) => React.isValidElement(child));

  const [ OpenedTabs, setOpenedTabs ] = useState(
    childElements.map((child) => Boolean(child.props.opened))
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
  
  const tabs = childElements.map((child, index) =>
    React.cloneElement(child, { index, OpenedTabs, setOpenedTabs, openTab, closeTab, ...child.props })
  );

  return (
    <div className={className} style={{ display: "flex", flexDirection: "column", ...style }}>
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

const Tab = ({ index, OpenedTabs, setOpenedTabs, openTab, closeTab, keepOpen=true, children }) => {
  useEffect(() => {
    if (!keepOpen && OpenedTabs[index]) {
      closeTab(index);
    }
  }, [keepOpen]);

  if (!keepOpen) {
    return null;
  }

  return (
    <>
      {React.cloneElement(children, { OpenedTabs, setOpenedTabs, openTab, closeTab })}
    </>
  );
};

export { Tabs, Tab };