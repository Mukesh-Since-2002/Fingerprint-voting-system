import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (!user.emailVerified) {
        setError('⚠️ Please verify your email before logging in.');
        return;
      }

      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const { role } = userSnap.data();
        setSuccess('✅ Login successful! Redirecting...');

        setTimeout(() => {
          if (role === 'admin') {
            navigate('/adminpage');
          } else if (role === 'voter') {
            navigate('/votingpage');
          } else {
            setError('❌ Unknown user role.');
          }
        }, 1000);
      } else {
        setError('❌ User data not found.');
      }
    } catch (err) {
      switch (err.code) {
        case 'auth/user-not-found':
          setError('❌ No user found with this email.');
          break;
        case 'auth/wrong-password':
          setError('❌ Incorrect password.');
          break;
        case 'auth/invalid-email':
          setError('❌ Invalid email address.');
          break;
        default:
          setError(`❌ ${err.message}`);
      }
    }
  };

  const loginWithFingerprint = async () => {
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/generate-authentication-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const options = await res.json();
      options.challenge = base64urlToBuffer(options.challenge);
      options.allowCredentials = options.allowCredentials.map((cred) => ({
        ...cred,
        id: base64urlToBuffer(cred.id),
      }));

      const credential = await navigator.credentials.get({ publicKey: options });

      const authResponse = {
        id: credential.id,
        rawId: bufferToBase64Url(credential.rawId),
        type: credential.type,
        response: {
          authenticatorData: bufferToBase64Url(credential.response.authenticatorData),
          clientDataJSON: bufferToBase64Url(credential.response.clientDataJSON),
          signature: bufferToBase64Url(credential.response.signature),
          userHandle: credential.response.userHandle
            ? bufferToBase64Url(credential.response.userHandle)
            : null,
        },
      };

      const verifyRes = await fetch('/verify-authentication', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authResponse),
      });

      const verifyData = await verifyRes.json();

      if (verifyData.verified) {
        setSuccess('✅ Fingerprint login successful! Redirecting...');
        // Redirect based on stored role (if stored separately, modify this)
        setTimeout(() => {
          navigate('/votingpage'); // Or dynamically check user role here
        }, 1000);
      } else {
        setError('❌ Fingerprint verification failed.');
      }
    } catch (err) {
      console.error(err);
      setError('❌ Fingerprint login failed.');
    }
  };

  // Helper functions
  const bufferToBase64Url = (buffer) => {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  };

  const base64urlToBuffer = (base64url) => {
    const padding = '='.repeat((4 - (base64url.length % 4)) % 4);
    const base64 = (base64url + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    return new Uint8Array([...rawData].map((char) => char.charCodeAt(0))).buffer;
  };

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleLogin}>
        <h2>Login</h2>

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
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button type="submit">Login</button>

        <button
          type="button"
          className="btn-primary"
          onClick={loginWithFingerprint}
        >
          Login with Fingerprint (Passkey)
        </button>

        <p>Don't have an account? <a href="/register">Register</a></p>
        <p><a href="/forgot-password">Forgot Password?</a></p>
      </form>
    </div>
  );
};

export default Login;
