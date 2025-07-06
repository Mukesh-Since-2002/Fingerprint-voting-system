// src/components/ImageUploader.js
import React, { useState } from 'react';
import axios from 'axios';

const ImageUploader = ({ onUpload }) => {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setImage(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleUpload = async () => {
    if (!image) return;

    setUploading(true);

    const formData = new FormData();
    formData.append('file', image);
    formData.append('upload_preset', 'YOUR_UPLOAD_PRESET'); // set this in Cloudinary settings

    try {
      const res = await axios.post(
        'https://api.cloudinary.com/v1_1/dwkocmgxp/image/upload',
        formData
      );
      onUpload(res.data.secure_url); // send uploaded URL back to parent
    } catch (err) {
      console.error('Upload Error:', err);
      alert('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input type="file" onChange={handleFileChange} accept="image/*" />
      {preview && <img src={preview} alt="preview" width="100" />}
      <button onClick={handleUpload} disabled={uploading}>
        {uploading ? 'Uploading...' : 'Upload to Cloudinary'}
      </button>
    </div>
  );
};

export default ImageUploader;
