const express = require('express');
const cors = require('cors');
const webauthRoutes = require('./webauth');

const app = express();

// ✅ Use Railway-provided PORT or fallback to 5000 for local testing
const PORT = process.env.PORT || 5000;

// ✅ Middleware
app.use(cors());
app.use(express.json());

// ✅ WebAuthn API Routes
app.use('/api', webauthRoutes);

// ✅ Root Route
app.get('/', (req, res) => {
  res.send('✅ Fingerprint Voting System Backend is Running');
});

// ✅ Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
