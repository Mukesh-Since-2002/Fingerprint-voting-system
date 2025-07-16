import React, { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import './Register.css';

// ✅ Backend API endpoint (must match the routes in your Express server)
const BACKEND_URL = 'https://fingerprint-voting-system-production.up.railway.app/api';

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
        createdAt: new Date().toISOString(),
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
    try {
      if (auth.currentUser) {
        await auth.currentUser.reload();
        if (auth.currentUser.emailVerified) {
          setIsVerified(true);
          setSuccess('Email successfully verified! You can now register fingerprint or log in.');
        } else {
          setError('Email not verified yet. Please check your inbox.');
        }
      }
    } catch (err) {
      setError('Error checking verification: ' + err.message);
    }
  };

  const registerFingerprint = async () => {
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`${BACKEND_URL}/generate-registration-options`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          uid: user.uid,
        }),
      });

      if (!res.ok) throw new Error('Failed to fetch registration options');

      const options = await res.json();

      options.challenge = base64urlToBuffer(options.challenge);
      options.user.id = base64urlToBuffer(options.user.id);

      if (options.excludeCredentials) {
        options.excludeCredentials = options.excludeCredentials.map((cred) => ({
          ...cred,
          id: base64urlToBuffer(cred.id),
        }));
      }

      const credential = await navigator.credentials.create({ publicKey: options });

      const registrationResponse = {
        id: credential.id,
        rawId: bufferToBase64Url(credential.rawId),
        type: credential.type,
        response: {
          attestationObject: bufferToBase64Url(credential.response.attestationObject),
          clientDataJSON: bufferToBase64Url(credential.response.clientDataJSON),
        },
      };

      const verificationRes = await fetch(`${BACKEND_URL}/verify-registration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registrationResponse),
      });

      const verificationData = await verificationRes.json();

      if (verificationData.verified) {
        setSuccess('✅ Fingerprint registered successfully!');
      } else {
        setError('❌ Fingerprint verification failed.');
      }
    } catch (err) {
      console.error(err);
      setError('❌ Fingerprint registration error: ' + err.message);
    }
  };

  const bufferToBase64Url = (buffer) =>
    btoa(String.fromCharCode(...new Uint8Array(buffer)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

  const base64urlToBuffer = (base64url) => {
    const padding = '='.repeat((4 - (base64url.length % 4)) % 4);
    const base64 = (base64url + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    return new Uint8Array([...rawData].map((char) => char.charCodeAt(0))).buffer;
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
          <button type="button" className="btn-warning" onClick={checkEmailVerified}>
            Check Email Verified
          </button>
        )}

        {isVerified && (
          <>
            <button type="button" className="btn-primary" onClick={registerFingerprint}>
              Register with Fingerprint (Passkey)
            </button>
            <button type="button" className="btn-success" onClick={() => navigate('/login')}>
              Go to Login
            </button>
          </>
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
const express = require('express');
const cors = require('cors');
const webauthRoutes = require('./webauth'); // Make sure webauth.js exists

const app = express();

// Use Railway-provided PORT or fallback to 5000
const PORT = process.env.PORT || 5000;

// Load environment variables directly
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || '';
const WEBAUTHN_ORIGIN = process.env.WEBAUTHN_ORIGIN;
const WEBAUTHN_RPID = process.env.WEBAUTHN_RPID;

// Log loaded vars
console.log('🔧 Loaded Environment Variables:', {
  FRONTEND_ORIGIN,
  WEBAUTHN_ORIGIN,
  WEBAUTHN_RPID,
});

// Warn if required vars are missing
if (!WEBAUTHN_ORIGIN || !WEBAUTHN_RPID) {
  console.error('❌ ERROR: WEBAUTHN_ORIGIN and WEBAUTHN_RPID must be set for WebAuthn to function!');
}

// Split comma-separated origins
const allowedOrigins = FRONTEND_ORIGIN.split(',');

// CORS setup
app.use(cors({
  origin: (origin, callback) => {
    console.log('🟢 Incoming request from:', origin);
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error('❌ Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json());

// Routes
app.use('/api', webauthRoutes);

app.get('/', (req, res) => {
  res.send('✅ Fingerprint Voting System Backend is Running');
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Backend URL: http://localhost:${PORT}`);
  if (WEBAUTHN_ORIGIN) {
    console.log(`🔐 Expected WebAuthn Origin: ${WEBAUTHN_ORIGIN}`);
    console.log(`🔐 Expected WebAuthn RP ID: ${WEBAUTHN_RPID}`);
  }
});

export default Register;
