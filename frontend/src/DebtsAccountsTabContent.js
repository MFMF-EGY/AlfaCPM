import { useState, useEffect, useRef, createContext, useContext } from 'react';
import { TabPanel } from 'react-tabs';
import axios from 'axios';
import { GlobalContext } from './App.js';

function DebtsAccountsTabContent(){
  return (
    <div className="Main-tab-content"></div>
  )
}

export default DebtsAccountsTabContent;