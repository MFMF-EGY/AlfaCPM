import { useState, useEffect, useContext } from "react";
import axios from "axios";
import { GlobalContext } from "@/App";
import { COMMERCIAL_API_URL } from "@/App";
import styles from "./DebtAccountsPageComponent.module.css";
import SearchBar from "@/UiComponents/SearchBar.jsx";
import SectionHeader from "@/UiComponents/SectionHeader";

export default function DebtAccountsPageComponent() {
  const { ProjectID, refreshToken } = useContext(GlobalContext);
  const [ debtAccounts, setDebtAccounts ] = useState([]);
  const [ selectedAccount, setSelectedAccount ] = useState(null);
  const fetchDebtAccounts = async (name) => {
    axios.get(`${COMMERCIAL_API_URL}/${ProjectID}/DebtAccounts`, {
      params: {
        RefreshToken: refreshToken,
        account_name: name
      }
    }).then(response => {
      setDebtAccounts(response.data.DebtAccounts)
    })
  }
  return (
    <div className="Page">
      <div className="Page-content">
        <SectionHeader title="حسابات الديون" />
        <SearchBar onSearch={fetchDebtAccounts} />
        <div className={styles.Panel}>
          {debtAccounts.map((account) => (
            <div key={account.id} className={`${styles.DebtAccountCardLayout} ${selectedAccount?.id === account.id ? styles.SelectedDebtAccountCard : styles.DebtAccountCard}`} onClick={() => setSelectedAccount(account)}>
              <h3>{account.Person_Name}</h3>
              <p>Balance: {account.Debt_Amount}</p>
            </div>
          ))}
        </div>
      </div>
    </div>

  )
}