import React, { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
import './Login.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleReset = async (e) => {
  e.preventDefault();
  setMessage('');
  setError('');

  try {
    await sendPasswordResetEmail(auth, email, {
      url: 'http://localhost:3000/reset-password',
      handleCodeInApp: true,
    });
    setMessage('Password reset email sent! Check your inbox.');
    setEmail('');
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      setError('Email not registered. Please sign up first.');
    } else if (err.code === 'auth/invalid-email') {
      setError('Invalid email format.');
    } else {
      setError(err.message);
    }
  }
};


  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleReset}>
        <h2>Forgot Password</h2>
        {error && <p className="error">{error}</p>}
        {message && <p style={{ color: 'green' }}>{message}</p>}
        <input type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <button type="submit">Send Reset Link</button>
        <p><a href="/login">Back to Login</a></p>
      </form>
    </div>
  );
};

export default ForgotPassword;
