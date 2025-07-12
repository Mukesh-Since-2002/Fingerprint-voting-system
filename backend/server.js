// server.js

const express = require('express');
const cors = require('cors');
const webauthRoutes = require('./webauth'); // WebAuthn logic in this file

const app = express();

// ✅ Use Railway-provided PORT or default to 5000 for local dev
const PORT = process.env.PORT || 5000;

// ✅ Middleware
app.use(cors());
app.use(express.json()); // Instead of body-parser (built-in in Express v4.16+)

// ✅ API Routes
app.use('/api', webauthRoutes);

// ✅ Root route to test deployment
app.get('/', (req, res) => {
  res.send('✅ Fingerprint Voting System Backend is Running');
});

// ✅ Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running at http://localhost:${PORT}`);
});

module.exports = app;
