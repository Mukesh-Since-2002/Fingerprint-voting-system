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
            navigate('/adminpage'); // 🔁 Updated path for admin
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

        <p>Don't have an account? <a href="/register">Register</a></p>
        <p><a href="/forgot-password">Forgot Password?</a></p>
      </form>
    </div>
  );
};

export default Login;
