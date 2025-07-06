import React, { useState } from 'react';
import { db } from '../firebase'; // ✅ Ensure this path is correct
import { collection, addDoc } from 'firebase/firestore';
import './Register.css';

const AddCandidate = () => {
  const [name, setName] = useState('');
  const [party, setParty] = useState('');
  const [image, setImage] = useState(null);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleImageUpload = async () => {
    const formData = new FormData();
    formData.append('file', image);
    formData.append('upload_preset', 'candidate'); // Cloudinary preset name
    formData.append('cloud_name', 'dwkocmgxp');

    try {
      const res = await fetch('https://api.cloudinary.com/v1_1/dwkocmgxp/image/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!data.secure_url) throw new Error('Image upload failed');
      return data.secure_url;
    } catch (err) {
      console.error('Cloudinary upload error:', err);
      throw new Error('Failed to upload image');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name || !party) {
      setError('Please fill all required fields');
      return;
    }

    try {
      let imageUrl = '';

      if (image) {
        imageUrl = await handleImageUpload();
      }

      await addDoc(collection(db, 'candidates'), {
        name,
        party,
        imageUrl,
      });

      setSuccess('Candidate added successfully!');
      setName('');
      setParty('');
      setImage(null);
    } catch (err) {
      console.error(err);
      setError('Error adding candidate: ' + err.message);
    }
  };

  return (
    <div className="register-container">
      <form className="register-form" onSubmit={handleSubmit}>
        <h2>Add Candidate</h2>
        {error && <p className="error">{error}</p>}
        {success && <p style={{ color: 'green' }}>{success}</p>}

        <input
          type="text"
          placeholder="Candidate Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <input
          type="text"
          placeholder="Party Name"
          value={party}
          onChange={(e) => setParty(e.target.value)}
          required
        />

        <input
          type="file"
          accept="image/*"
          onChange={(e) => setImage(e.target.files[0])}
        />

        <button type="submit">Add Candidate</button>
      </form>
    </div>
  );
};

export default AddCandidate;
