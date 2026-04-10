import { useState, useEffect, useContext } from "react";
import axios from "axios";
import { GlobalContext } from "@/App";
import { ACCOUNTS_API_URL, HR_API_URL } from "@/App";
import styles from "./EmployeesPageComponent.module.css";
import SearchBar from "@/UiComponents/SearchBar.jsx";
import SectionHeader from "@/UiComponents/SectionHeader";
import userIcon from "@/assets/user-icon.svg";

export default function EmployeesPageComponent(){
  const { ProjectID, refreshToken } = useContext(GlobalContext);
  const [ unemployedAccounts, setUnemployedAccounts ] = useState([]);
  const [ employees, setEmployees ] = useState([]);
  const [ selectedAccount, setSelectedAccount ] = useState(null);
  const [ selectedEmployee, setSelectedEmployee ] = useState(null);
  const [ openedForm, setOpendForm ] = useState("");

  const fetchUnemployedAccounts = async (name) => {
    axios.get(`${ACCOUNTS_API_URL}/unemployed`, {
      params: {
        ProjectID: ProjectID,
        RefreshToken: refreshToken,
        user_name: name
      }
    })
    .then(response => {
      setUnemployedAccounts(response.data.UnemployedAccounts);
    })
    .catch(error => {
      console.error("Error fetching accounts:", error);
    });
  }
  const fetchEmployees = async (name) => {
    axios.get(`${HR_API_URL}/employees`, {
      params: {
        ProjectID: ProjectID,
        RefreshToken: refreshToken,
        user_name: name || undefined
      }
    })
    .then(response => {
      setEmployees(response.data.Employees);
    })
    .catch(error => {
      console.error("Error fetching employees:", error);
    });
  }

  const assignEmployee = async () => {
    if (!selectedAccount) return;
    axios.post(`${HR_API_URL}/employees`, {
      ProjectID: ProjectID,
      RefreshToken: refreshToken,
      AccountID: selectedAccount.id
    })
    .then(response => {
      fetchUnemployedAccounts();
      fetchEmployees();
      setSelectedAccount(null);
    })
    .catch(error => {
      console.error("Error assigning employee:", error);
    });
  }

  const unassignEmployee = async () => {
    if (!selectedEmployee) return;
    axios.delete(`${HR_API_URL}/employees`, {
      params: {
        ProjectID: ProjectID,
        RefreshToken: refreshToken,
        EmployeeID: selectedEmployee.Employee_ID
      }
    })
    .then(response => {
      fetchUnemployedAccounts();
      fetchEmployees();
      setSelectedEmployee(null);
    })
    .catch(error => {
      console.error("Error unassigning employee:", error);
    });
  }

  useEffect(() => {
    if (refreshToken && ProjectID){
      fetchUnemployedAccounts();
      fetchEmployees();
    }
  }, [refreshToken, ProjectID]);

  return (
    <div className="Page">
      <div className="Page-content">
        <div className={styles.PanelsContainer}>
          <div className={styles.Panel}>
            <h1 className={styles.PanelTitle}>الحسابات</h1>
            <SearchBar onSearch={(value) => fetchUnemployedAccounts(value)} />
            <ul className={styles.ProfilesList}>
              {unemployedAccounts.map((account) => (
                <li
                  className={`${styles.ProfileLayout} ${selectedAccount?.id === account.id ? styles.SelectedProfile : styles.Profile}`}
                  key={account.id}
                  onClick={() => {
                    setSelectedAccount(account);
                    setSelectedEmployee(null);
                  }}
                >
                  <img
                    src={account.profile_picture || userIcon}
                    alt="Profile"
                    className={styles.ProfilePicture}
                  />
                  <span>{account.user_name}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className={styles.Panel}>
            <h1 className={styles.PanelTitle}>الموظفين</h1>
            <SearchBar onSearch={(value) => fetchEmployees(value)} />
            <ul className={styles.ProfilesList}>
              {employees.map((employee) => (
                <li
                  className={`${styles.ProfileLayout} ${selectedEmployee?.Employee_ID === employee.Employee_ID ? styles.SelectedProfile : styles.Profile}`}
                  key={employee.Employee_ID}
                  onClick={() => {
                    setSelectedEmployee(employee);
                    setSelectedAccount(null);
                  }}
                >
                  <img
                    src={employee.profile_picture || userIcon}
                    alt="Profile"
                    className={styles.ProfilePicture}
                  />
                  <span>{employee.user_name}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <div className="Side-bar">
        {selectedAccount && (
          <>
            <button className="Sidebar-button" onClick={assignEmployee}>تعيين كموظف</button>
            <button className="Sidebar-button">تفاصيل الحساب</button>
          </>
        )}
        {selectedEmployee && (
          <>
            <button className="Sidebar-button" onClick={unassignEmployee}>إلغاء تعيين</button>
            <button className="Sidebar-button">تفاصيل الموظف</button>
            <button className="Sidebar-button" onClick={() => setOpendForm("EmployeePermissionsForm")}>تعديل الصلاحيات</button>
          </>
        )}
      </div>
      {openedForm === "EmployeePermissionsForm" && <EmployeePermissionsForm employee={selectedEmployee} setOpenedForm={setOpendForm}/>}
    </div>
  );
}

export function EmployeePermissionsForm({ employee, setOpenedForm }) {
  const { ProjectID, refreshToken } = useContext(GlobalContext);
  const [ loading, setLoading ] = useState(true);
  const [ permissions, setPermissions ] = useState([]);

  const fetchPermissions = async () => {
    axios.get(`${HR_API_URL}/permissions`, {
      params: {
        ProjectID: ProjectID,
        RefreshToken: refreshToken,
        EmployeeID: employee.Employee_ID
      }
    })
    .then(response => {
      setPermissions(response.data.Permissions);
      setLoading(false);
    })
    .catch(error => {
      console.error("Error fetching permissions:", error);
      setLoading(false);
    });
  }

  const savePermissions = async () => {
    axios.put(`${HR_API_URL}/permissions`, {
      ProjectID: ProjectID,
      RefreshToken: refreshToken,
      EmployeeID: employee.Employee_ID,
      Permissions: permissions
    })
    .then(response => {
      setOpenedForm("");
    })
    .catch(error => {
      console.error("Error saving permissions:", error);
    });
  }

  useEffect(() => {
    if (employee) {
      fetchPermissions();
    }
  }, [employee]);

  if (loading) {
    return (
      <div className="Form-container">
        <div className="Form">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="Form-container">
      <div className="Form">
        <div>
          <button className="Form-close" onClick={(event) => setOpenedForm("")}>
            X
          </button>
        </div>
        <h2>صلاحيات {employee.user_name}</h2>
        <div className={styles.PermissionsList}>
          <SectionHeader>
            <h3>صلاحيات بينات المنتجات</h3>
          </SectionHeader>
          <div className={styles.PermissionsSection}>
            <div className={styles.Permission}>
              <label>إضافة منتج</label>
              <input
                type="checkbox"
                id="add_product"
                name="add_product"
                checked={permissions.Can_Add_Product}
                onChange={(event) => {
                  setPermissions({
                    ...permissions,
                    Can_Add_Product: event.target.checked,
                  });
                }}
              />
            </div>
            <div className={styles.Permission}>
              <label>تعديل منتج</label>
              <input
                type="checkbox"
                id="edit_product"
                name="edit_product"
                checked={permissions.Can_Edit_Product}
                onChange={(event) => {
                  setPermissions({
                    ...permissions,
                    Can_Edit_Product: event.target.checked,
                  });
                }}
              />
            </div>
            <div className={styles.Permission}>
              <label>حذف منتج</label>
              <input
                type="checkbox"
                id="delete_product"
                name="delete_product"
                checked={permissions.Can_Delete_Product}
                onChange={(event) => {
                  setPermissions({
                    ...permissions,
                    Can_Delete_Product: event.target.checked,
                  });
                }}
              />
            </div>
          </div>
          <SectionHeader>
            <h3>صلاحيات الشراء</h3>
          </SectionHeader>
          <div className={styles.PermissionsSection}>
            <div className={styles.Permission}>
              <label>عرض فواتير الشراء</label>
              <input
                type="checkbox"
                id="view_purchases"
                name="view_purchases"
                checked={permissions.Can_View_Purchases}
                onChange={(event) => {
                  setPermissions({
                    ...permissions,
                    Can_View_Purchases: event.target.checked,
                  });
                }}
              />
            </div>
            <div className={styles.Permission}>
              <label>إنشاء فاتورة شراء</label>
              <input
                type="checkbox"
                id="add_purchase"
                name="add_purchase"
                checked={permissions.Can_Purchase}
                onChange={(event) => {
                  setPermissions({
                    ...permissions,
                    Can_Purchase: event.target.checked,
                  });
                }}
              />
            </div>
            <div className={styles.Permission}>
              <label>تعديل فاتورة شراء</label>
              <input
                type="checkbox"
                id="edit_purchase"
                name="edit_purchase"
                checked={permissions.Can_Edit_Purchase}
                onChange={(event) => {
                  setPermissions({
                    ...permissions,
                    Can_Edit_Purchase: event.target.checked,
                  });
                }}
              />
            </div>
            <div className={styles.Permission}>
              <label>حذف فاتورة شراء</label>
              <input
                type="checkbox"
                id="delete_purchase"
                name="delete_purchase"
                checked={permissions.Can_Delete_Purchase}
                onChange={(event) => {
                  setPermissions({
                    ...permissions,
                    Can_Delete_Purchase: event.target.checked,
                  });
                }}
              />
            </div>
          </div>
          <SectionHeader>
            <h3>صلاحيات البيع</h3>
          </SectionHeader>
          <div className={styles.PermissionsSection}>
            <div className={styles.Permission}>
              <label>عرض فواتير البيع</label>
              <input
                type="checkbox"
                id="view_sells"
                name="view_sells"
                checked={permissions.Can_View_Sells}
                onChange={(event) => {
                  setPermissions({
                    ...permissions,
                    Can_View_Sells: event.target.checked,
                  });
                }}
              />
            </div>
            <div className={styles.Permission}>
              <label>إنشاء فاتورة بيع</label>
              <input
                type="checkbox"
                id="add_selling"
                name="add_selling"
                checked={permissions.Can_Sell}
                onChange={(event) => {
                  setPermissions({
                    ...permissions,
                    Can_Sell: event.target.checked,
                  });
                }}
              />
            </div>
            <div className={styles.Permission}>
              <label>تعديل فاتورة بيع</label>
              <input
                type="checkbox"
                id="edit_selling"
                name="edit_selling"
                checked={permissions.Can_Edit_Sell}
                onChange={(event) => {
                  setPermissions({
                    ...permissions,
                    Can_Edit_Sell: event.target.checked,
                  });
                }}
              />
            </div>
            <div className={styles.Permission}>
              <label>حذف فاتورة بيع</label>
              <input
                type="checkbox"
                id="delete_selling"
                name="delete_selling"
                checked={permissions.Can_Delete_Sell}
                onChange={(event) => {
                  setPermissions({
                    ...permissions,
                    Can_Delete_Sell: event.target.checked,
                  });
                }}
              />
            </div>
          </div>
          <SectionHeader>
            <h3>صلاحيات التحويلات</h3>
          </SectionHeader>
          <div className={styles.PermissionsSection}>
            <div className={styles.Permission}>
              <label>عرض مستندات التحويل</label>
              <input
                type="checkbox"
                id="view_transitions"
                name="view_transitions"
                checked={permissions.Can_View_Transitions}
                onChange={(event) => {
                  setPermissions({
                    ...permissions,
                    Can_View_Transitions: event.target.checked,
                  });
                }}
              />
            </div>
            <div className={styles.Permission}>
              <label>إنشاء مستند تحويل</label>
              <input
                type="checkbox"
                id="add_transition"
                name="add_transition"
                checked={permissions.Can_Transit}
                onChange={(event) => {
                  setPermissions({
                    ...permissions,
                    Can_Transit: event.target.checked,
                  });
                }}
              />
            </div>
            <div className={styles.Permission}>
              <label>تعديل مستند تحويل</label>
              <input
                type="checkbox"
                id="edit_transition"
                name="edit_transition"
                checked={permissions.Can_Edit_Transition}
                onChange={(event) => {
                  setPermissions({
                    ...permissions,
                    Can_Edit_Transition: event.target.checked,
                  });
                }}
              />
            </div>
            <div className={styles.Permission}>
              <label>حذف مستند تحويل</label>
              <input
                type="checkbox"
                id="delete_transition"
                name="delete_transition"
                checked={permissions.Can_Delete_Transition}
                onChange={(event) => {
                  setPermissions({
                    ...permissions,
                    Can_Delete_Transition: event.target.checked,
                  });
                }}
              />
            </div>
          </div>
          <SectionHeader>
            <h3>صلاحيات مؤثرات الكميات</h3>
          </SectionHeader>
          <div className={styles.PermissionsSection}>
            <div className={styles.Permission}>
              <label>عرض مؤثرات الكميات</label>
              <input
                type="checkbox"
                id="view_adjustments"
                name="view_adjustments"
                checked={permissions.Can_View_Adjustments}
                onChange={(event) => {
                  setPermissions({
                    ...permissions,
                    Can_View_Adjustments: event.target.checked,
                  });
                }}
              />
            </div>
            <div className={styles.Permission}>
              <label>انشاء مؤثر كمية</label>
              <input
                type="checkbox"
                id="adjust_quantity"
                name="adjust_quantities"
                checked={permissions.Can_Adjust_Quantity}
                onChange={(event) => {
                  setPermissions({
                    ...permissions,
                    Can_Adjust_Quantity: event.target.checked,
                  });
                }}
              />
            </div>
            <div className={styles.Permission}>
              <label>تعديل مؤثر كمية</label>
              <input
                type="checkbox"
                id="edit_adjustment"
                name="edit_adjustments"
                checked={permissions.Can_Edit_Adjustment}
                onChange={(event) => {
                  setPermissions({
                    ...permissions,
                    Can_Edit_Adjustment: event.target.checked,
                  });
                }}
              />
            </div>
            <div className={styles.Permission}>
              <label>حذف مؤثر كمية</label>
              <input
                type="checkbox"
                id="delete_adjustment"
                name="delete_adjustments"
                checked={permissions.Can_Delete_Adjustment}
                onChange={(event) => {
                  setPermissions({
                    ...permissions,
                    Can_Delete_Adjustment: event.target.checked,
                  });
                }}
              />
            </div>
          </div>
        </div>
        <div>
          <button className="Form-submit" onClick={() => savePermissions()}>حفظ</button>
        </div>
      </div>
    </div>
  );
}