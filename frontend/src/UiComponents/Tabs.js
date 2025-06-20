import React, { useState, createContext } from "react";
export const TabContext = createContext();
const Tabs = ({ children, openedTabs }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [tabs] = useState(React.Children.map(children, (child) =>
    React.cloneElement(child, { closable: child.props.closable, title: child.props.title })
  ));
  const [OpenedTabs, setOpenedTabs] = useState(openedTabs ? openedTabs : Array(tabs.length).fill(true));

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

  return (
    <TabContext.Provider value={{ OpenedTabs, setOpenedTabs }}>
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
                {tab.props.children}
              </div>
            )
          ))}
        </div>
      </div>
    </TabContext.Provider>
  );
};

const Tab = ({ title, closable, children }) => {
  return <div className="Tab-content" title={title} closable={closable}>{children}</div>;
};

export { Tabs, Tab };