const express = require('express');
const cors = require('cors');
const webauthRoutes = require('./webauth'); // Make sure webauth.js exists

const app = express();

// Use Railway-provided PORT or fallback to 5000
const PORT = process.env.PORT || 5000;

// Load environment variables directly
const FRONTEND_ORIGIN = 'https://fingerprint-voting-syste-7687a.web.app';
const WEBAUTHN_ORIGIN = 'https://ravishing-playfulness-production.up.railway.app';
const WEBAUTHN_RPID = 'ravishing-playfulness-production.up.railway.app';

// Log loaded vars
console.log('🔧 Loaded Environment Variables:', {
  FRONTEND_ORIGIN,
  WEBAUTHN_ORIGIN,
  WEBAUTHN_RPID,
});

// Warn if required vars are missing
if (!WEBAUTHN_ORIGIN || !WEBAUTHN_RPID) {
  console.error('❌ ERROR: WEBAUTHN_ORIGIN and WEBAUTHN_RPID must be set for WebAuthn to function!');
}

// Split comma-separated origins
const allowedOrigins = FRONTEND_ORIGIN.split(',');

// CORS setup
app.use(cors({
  origin: (origin, callback) => {
    console.log('🟢 Incoming request from:', origin);
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error('❌ Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json());

// Routes
app.use('/api', webauthRoutes);

app.get('/', (req, res) => {
  res.send('✅ Fingerprint Voting System Backend is Running');
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Backend URL: http://localhost:${PORT}`);
  if (WEBAUTHN_ORIGIN) {
    console.log(`🔐 Expected WebAuthn Origin: ${WEBAUTHN_ORIGIN}`);
    console.log(`🔐 Expected WebAuthn RP ID: ${WEBAUTHN_RPID}`);
  }
});
