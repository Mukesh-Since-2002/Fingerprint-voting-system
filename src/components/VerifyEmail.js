import React, { useEffect, useState } from 'react';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';

const VerifyEmail = () => {
  const [message, setMessage] = useState('Please check your email for verification link...');
  const [checking, setChecking] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const interval = setInterval(async () => {
      setChecking(true);
      await auth.currentUser.reload(); // reload user from Firebase
      if (auth.currentUser.emailVerified) {
        clearInterval(interval);
        setMessage('Email verified! Redirecting to login...');
        setTimeout(() => navigate('/login'), 1500);
      }
      setChecking(false);
    }, 3000); // Check every 3 seconds

    return () => clearInterval(interval);
  }, [navigate]);

  return (
    <div className="login-container">
      <div className="login-form">
        <h2>Email Verification</h2>
        <p>{message}</p>
        {checking && <p>Checking verification status...</p>}
      </div>
    </div>
  );
};

export default VerifyEmail;
