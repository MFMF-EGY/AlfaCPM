import { useState, useContext } from 'react';
import axios from 'axios';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import jwtDecode from 'jwt-decode';
import { GlobalContext } from '../../App.jsx';
import styles from './RegistrationFormComponent.module.css';
import {AUTH_API_URL} from '../../App.jsx';

export default function RegisterationFormComponent({ onLoginSuccess }) {
  const { setFormSelector } = useContext(GlobalContext);
  const [ email, setEmail ] = useState('');
  const [ firstName, setFirstName ] = useState('');
  const [ secondName, setSecondName ] = useState('');
  const [ thirdName, setThirdName ] = useState('');
  const [ forthName, setForthName ] = useState('');
  const [ password, setPassword ] = useState('');
  const [ confirmPassword, setConfirmPassword ] = useState('');
  const [ nationalID, setNationalID ] = useState('');
  const [ oauthProvider, setOAuthProvider ] = useState('');
  const [ oauthToken, setOAuthToken ] = useState(null);
  const [ error, setError ] = useState(null);

  const fillFields = (credentialResponse) => {
    const decoded = jwtDecode(credentialResponse.credential);
    setOAuthProvider("google");
    setOAuthToken(credentialResponse.credential);
    setEmail(decoded.email);
    const names = decoded.name.split(" ");
    setFirstName(names[0] || "");
    setSecondName(names[1] || "");
    setThirdName(names[2] || "");
    setForthName(names.slice(3).join(" ") || "");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("كلمات المرور غير متطابقة");
      return;
    }
    console.log(AUTH_API_URL)
    await axios.post(AUTH_API_URL + '/register', {
      Email: email,
      First_Name: firstName,
      Second_Name: secondName,
      Third_Name: thirdName,
      Fourth_Name: forthName,
      Password: password,
      OAuthProvider: oauthProvider,
      OAuthToken: oauthToken
    })
    .then(response => {
      onLoginSuccess(response.data);
    })
    .catch(err => {
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError("حدث خطأ أثناء التسجيل. الرجاء المحاولة مرة أخرى.");
      }
    });
  }

  return (
    <div className={`Form-container ${styles.RegistrationFormContainer}`}>
      <div style={{ display: 'flex' }}>
        <button className='Form-close' onClick={() => setFormSelector("")}>X</button>
      </div>
      <form onSubmit={handleSubmit}>
        <div className={styles.SplitedForm}>
          <div>
            <div>
              <label>الاسم</label>
            </div>
            <div className={styles.FieldsGroup}>
              <input 
                type="text" 
                value={firstName} 
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
              <input
                type="text"
                value={secondName}
                onChange={(e) => setSecondName(e.target.value)}
                required
              />
              <input
                type="text"
                value={thirdName}
                onChange={(e) => setThirdName(e.target.value)}
                required
              />
              <input
                type="text"
                value={forthName}
                onChange={(e) => setForthName(e.target.value)}
                required
              />
            </div>
            <div className={styles.FieldsGroup}>
              <label>كلمة المرور</label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <label>تأكيد كلمة المرور</label>
              <input 
                type="password" 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <div className={styles.FieldsGroup}>
              <label>البريد اﻹلكتروني</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                disabled={oauthProvider ? true : false}
                required 
              />
              <label>الرقم القومي</label>
              <input 
                type="text"
                value={nationalID}
                onChange={(e) => setNationalID(e.target.value)}
                required 
              />
            </div>
            {error && <div className="error">{error}</div>}
            <button type="submit" className={styles.RegisterButton}>دخول</button>
          </div>
          {!oauthProvider &&
            <div>
              <div><label>التسجيل من خلال</label></div>
              <div className={styles.OAuthButtonsContainer}>
                <GoogleOAuthProvider clientId="417283093219-tq3ucsnemrskhnp8eavql9bjjrmq775t.apps.googleusercontent.com">
                  <GoogleLogin
                    className={styles.OAuthButton}
                    onSuccess={fillFields}
                    onError={() => {
                      console.log("Login Failed");
                    }}
                  />
                </GoogleOAuthProvider>
              </div>
            </div>
          }
        </div>
      </form>
    </div>
  )
}