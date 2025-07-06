import React, { useState } from 'react';
import { confirmPasswordReset } from 'firebase/auth';
import { auth } from '../firebase';
import { useSearchParams, useNavigate } from 'react-router-dom';
import './Login.css';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const oobCode = searchParams.get('oobCode');

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (!oobCode) {
      setError("Invalid or missing reset code. Please request a new password reset email.");
      return;
    }

    try {
      await confirmPasswordReset(auth, oobCode, password);
      setMessage('Password reset successful! Redirecting to login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleResetPassword}>
        <h2>Reset Password</h2>
        {error && <p className="error">{error}</p>}
        {message && <p style={{ color: 'green' }}>{message}</p>}
        <input
          type="password"
          placeholder="Enter new password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">Reset Password</button>
      </form>
    </div>
  );
};

export default ResetPassword;
