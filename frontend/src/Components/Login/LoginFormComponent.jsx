import { useState, useContext } from 'react';
import axios from 'axios';
import styles from './LoginFormComponent.module.css';
import { GlobalContext } from '../../App.jsx';
import { AUTH_API_URL } from '../../App.jsx';

export default function LoginFormComponent({ onLoginSuccess }) {
  const { setFormSelector } = useContext(GlobalContext);
  const [ email, setEmail ] = useState('');
  const [ password, setPassword ] = useState('');
  const [ error, setError ] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    axios.get(`${AUTH_API_URL}/login`, { params: { email, password } })
    .then(response => {
      if (response.status === 200) {
        onLoginSuccess(response.data.RefreshToken);
      } else {
        setError(response.data.message);
      }
    })
    .catch(error => {
      setError("حدث خطأ أثناء تسجيل الدخول");
    });
  }
  return (
    <div className={`Form-container ${styles.LoginFormContainer}`}>
      <div style={{ display: 'flex' }}>
        <button className='Form-close' onClick={() => setFormSelector("")}>X</button>
      </div>
      <form onSubmit={handleSubmit}>
        <div>
          <div>
            <label>البريد اﻹلكتروني</label>
          </div>
          <div>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
            />
          </div>
        </div>
        <div>
          <label>كلمة المرور</label>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
          />
        </div>
        {error && <div className="error">{error}</div>}
        <button type="submit" className={styles.LoginButton}>دخول</button>
      </form>
    </div>
  )
}