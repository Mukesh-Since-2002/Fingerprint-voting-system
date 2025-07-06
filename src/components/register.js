import React, { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  reload,
} from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import './Register.css';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('voter');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [user, setUser] = useState(null);
  const [isVerified, setIsVerified] = useState(false);
  const [showLoginLink, setShowLoginLink] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setShowLoginLink(false);

    if (!email || !password || !role) {
      setError('All fields are required');
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;

      await sendEmailVerification(newUser);

      await setDoc(doc(db, 'users', newUser.uid), {
        email,
        role,
        createdAt: new Date().toISOString()
      });

      setUser(newUser);
      setSuccess('Registered! A verification link has been sent to your email.');
      setEmail('');
      setPassword('');
      setRole('voter');
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please login.');
        setShowLoginLink(true);
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else {
        setError('Registration failed: ' + err.message);
      }
    }
  };

  const checkEmailVerified = async () => {
    if (user) {
      await reload(user);
      if (user.emailVerified) {
        setIsVerified(true);
      } else {
        setError('Email not verified yet. Please check your inbox.');
      }
    }
  };

  return (
    <div className="register-container">
      <form className="register-form" onSubmit={handleRegister}>
        <h2>Register</h2>
        {error && <p className="error">{error}</p>}
        {success && <p className="success">{success}</p>}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password (min 6 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <div className="role-cards">
          <label className={`role-card ${role === 'voter' ? 'selected' : ''}`}>
            <input
              type="radio"
              name="role"
              value="voter"
              checked={role === 'voter'}
              onChange={() => setRole('voter')}
              hidden
            />
            <h3>Voter</h3>
          </label>

          <label className={`role-card ${role === 'admin' ? 'selected' : ''}`}>
            <input
              type="radio"
              name="role"
              value="admin"
              checked={role === 'admin'}
              onChange={() => setRole('admin')}
              hidden
            />
            <h3>Admin</h3>
          </label>
        </div>

        <button type="submit">Register</button>

        {user && !isVerified && (
          <button
            type="button"
            onClick={checkEmailVerified}
            style={{
              marginTop: '10px',
              backgroundColor: '#ffa500',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '10px',
              cursor: 'pointer',
              width: '100%',
              fontWeight: 'bold'
            }}
          >
            Check Email Verified
          </button>
        )}

        {isVerified && (
          <button
            type="button"
            onClick={() => navigate('/login')}
            style={{
              marginTop: '10px',
              backgroundColor: '#4caf50',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '10px',
              cursor: 'pointer',
              width: '100%',
              fontWeight: 'bold'
            }}
          >
            Go to Login
          </button>
        )}

        {showLoginLink && (
          <p style={{ marginTop: '15px' }}>
            Already have an account? <a href="/login">Login</a>
          </p>
        )}
      </form>
    </div>
  );
};

export default Register;
