import React, { useEffect, useState } from 'react';
import { collection, getDocs, doc, updateDoc, increment, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useNavigate } from 'react-router-dom';
import './VotingPage.css';

const VotingPage = () => {
  const [candidates, setCandidates] = useState([]);
  const [voted, setVoted] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = () => {
      auth.onAuthStateChanged(async (user) => {
        if (!user) {
          navigate('/login');
        } else {
          const voteRef = doc(db, 'votes', user.uid);
          const voteSnap = await getDoc(voteRef);
          if (voteSnap.exists()) {
            setVoted(true);
          }
        }
      });
    };

    const fetchCandidates = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'candidates'));
        const candidateList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setCandidates(candidateList);
      } catch (err) {
        console.error('Error fetching candidates:', err);
      }
    };

    checkAuth();
    fetchCandidates();
  }, [navigate]);

  const fingerprintAuth = async () => {
    if (window.PublicKeyCredential) {
      try {
        await navigator.credentials.get({
          publicKey: {
            challenge: new Uint8Array(32),
            timeout: 60000,
            userVerification: 'required',
          },
        });
        return true;
      } catch (err) {
        console.error('Fingerprint auth failed:', err);
        return false;
      }
    } else {
      alert('Fingerprint authentication is not supported on this browser.');
      return false;
    }
  };

  const handleVote = async (id) => {
    if (voted) {
      return alert('You have already voted!');
    }

    const verified = await fingerprintAuth();
    if (!verified) {
      return alert('Fingerprint authentication failed.');
    }

    try {
      const candidateRef = doc(db, 'candidates', id);
      await updateDoc(candidateRef, {
        votes: increment(1)
      });

      const voteRef = doc(db, 'votes', auth.currentUser.uid);
      await updateDoc(voteRef, {
        candidateId: id,
        votedAt: new Date().toISOString()
      }).catch(async () => {
        // fallback in case doc doesn't exist yet
        await setDoc(voteRef, {
          candidateId: id,
          votedAt: new Date().toISOString()
        });
      });

      alert('✅ Vote submitted successfully!');
      setVoted(true);
    } catch (err) {
      console.error('Error submitting vote:', err);
      alert('❌ Failed to submit your vote.');
    }
  };

  return (
    <div className="voting-container">
      <h2 className="voting-title">Vote for Your Favorite Candidate</h2>
      <div className="candidate-grid">
        {candidates.map(candidate => (
          <div className="candidate-card" key={candidate.id}>
            <img src={candidate.imageUrl} alt={candidate.name} />
            <h3>{candidate.name}</h3>
            <p>Party: {candidate.party}</p>
            <button
              className="vote-btn"
              onClick={() => handleVote(candidate.id)}
              disabled={voted}
            >
              {voted ? 'Voted' : 'Vote'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VotingPage;
