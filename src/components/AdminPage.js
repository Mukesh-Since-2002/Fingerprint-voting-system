// src/components/AdminPage.js
import React, { useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import './AdminPage.css';

const AdminPage = () => {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate('/login');
        return;
      }

      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists() && userSnap.data().role === 'admin') {
        setIsAdmin(true);
      } else {
        navigate('/votingpage'); // redirect non-admins
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [navigate]);

  if (loading) return <div className="admin-loading">Loading...</div>;

  return (
    <div className="admin-container">
      <h2>Welcome Admin</h2>
      <p>You have full control over this system.</p>
      <button className="add-candidate-btn" onClick={() => navigate('/addcandidate')}>
        ➕ Add Candidate
      </button>
    </div>
  );
};

export default AdminPage;
