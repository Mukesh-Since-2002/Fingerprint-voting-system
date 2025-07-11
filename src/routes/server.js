// server.js

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const webauthRoutes = require('./webauth'); // Ensure this file exists in same folder

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// WebAuthn routes
app.use('/api', webauthRoutes);

// Root test route
app.get('/', (req, res) => {
  res.send('✅ Fingerprint Voting System Backend is Running');
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server started on http://localhost:${PORT}`);
});
