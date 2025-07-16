const express = require('express');
const cors = require('cors');
const webauthRoutes = require('./webauth'); // Assuming webauth.js is in the same directory

const app = express();

// Use Railway-provided PORT. Fallback to 5000 for *local development only*.
const PORT = process.env.PORT || 5000;

const allowedOrigins = process.env.FRONTEND_ORIGIN ? process.env.FRONTEND_ORIGIN.split(',') : [];

const corsOptions = {
  origin: function (origin, callback) {

    console.log('🟢 CORS origin received:', origin);
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST'], // Specify allowed HTTP methods
  allowedHeaders: ['Content-Type', 'Authorization'], // Specify allowed headers
  credentials: true // Allow cookies, authorization headers to be sent
};

app.use(cors(corsOptions));
app.use(express.json());

// WebAuthn API Routes
app.use('/api', webauthRoutes);

// Root Route
app.get('/', (req, res) => {
  res.send('✅ Fingerprint Voting System Backend is Running');
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`Backend URL: http://localhost:${PORT}`);
  if (process.env.WEBAUTHN_ORIGIN) {
    console.log(`Expected WebAuthn Origin: ${process.env.WEBAUTHN_ORIGIN}`);
    console.log(`Expected WebAuthn RP ID: ${process.env.WEBAUTHN_RPID}`);
  } else {
    console.warn("⚠️ WEBAUTHN_ORIGIN and WEBAUTHN_RPID environment variables are not set. WebAuthn might not work correctly.");
  }
});