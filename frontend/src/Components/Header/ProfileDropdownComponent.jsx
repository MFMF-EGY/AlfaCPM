import { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { GlobalContext, AUTH_API_URL } from '../../App.jsx';
import styles from './ProfileDropdownComponent.module.css';
import userIcon from '../../assets/user-icon.svg';

export default function ProfileDropdownComponent({ onLoginSuccess }) {
  const { user, setUser, refreshToken, setRefreshToken, setProjectID, setStoreID, setFormSelector } = useContext(GlobalContext);
  const [ isDropdownOpen, setIsDropdownOpen ] = useState(false);

  const handleClickOutside = (event) => {
    if (!event.target.closest(`.${styles.ProfileDropdownContainer}`)) {
      setIsDropdownOpen(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setRefreshToken(null);
    setProjectID(null);
    setStoreID(null);
    setFormSelector(null);
    setIsDropdownOpen(false);
  };

  //Check for stored user session on mount
  useEffect(() => {
    if (refreshToken) {
      const validateRefreshToken = async () => {
        await axios.get(AUTH_API_URL + '/refresh', {
          params: {
            "token": refreshToken
          }
        })
        .then((response) => {
          if (response.status === 200) {
            let { First_Name, Second_Name, Email, Profile_Picture } = response.data;
            setUser({
              FirstName: First_Name,
              SecondName: Second_Name,
              Email: Email,
              ProfilePicture: Profile_Picture,
            });
          } else {
            setUser(null);
            setRefreshToken(null);
          }
        })
        .catch((error) => {
          console.error('Error validating token:', error);
          setUser(null);
          setRefreshToken(null);
        });
      };
      validateRefreshToken();
    }
  }, [refreshToken]);

  useEffect(() => {
    if (isDropdownOpen) {
      document.addEventListener('pointerdown', handleClickOutside);
    } else {
      document.removeEventListener('pointerdown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  return (

    user ? (
      <div className={styles.ProfileDropdownContainer}>
        <button className={styles.ProfileDropdown} onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
          <img src={user.ProfilePicture || userIcon} alt="Profile" />
          <span>{user ? user.FirstName + " " + user.SecondName : "Guest"}</span>
        </button>
        {isDropdownOpen && (
          <ul className={styles.DropdownMenu}>
            <li>الملف الشخصي</li>
            <li onClick={handleLogout}>تسجيل الخروج</li>
          </ul>
        )}
      </div>
    ) : (
      <div className={styles.LoginContainer}>
        <button onClick={() => { setFormSelector("LoginForm") }} className={styles.LoginButton}>تسجيل الدخول</button>
        <button onClick={() => { setFormSelector("RegisterForm") }} className={styles.RegisterButton}>إنشاء حساب</button>  
      </div>
    )
  )
}