const express = require('express');
const cors = require('cors');
const webauthRoutes = require('./webauth'); // Ensure this file exists and exports a router

const app = express();
const PORT = process.env.PORT || 5000;

// Load required environment variables
const FRONTEND_ORIGIN = 'https://fingerprint-voting-syste-7687a.web.app';
const origin = 'https://ravishing-playfulness-production.up.railway.app';
const rpID = 'ravishing-playfulness-production.up.railway.app';


console.log('🔧 Loaded Environment Variables:', {
  FRONTEND_ORIGIN,
  WEBAUTHN_ORIGIN,
  WEBAUTHN_RPID,
});

// Fail early if env variables are not set
if (!WEBAUTHN_ORIGIN || !WEBAUTHN_RPID) {
  console.error('❌ ERROR: WEBAUTHN_ORIGIN and WEBAUTHN_RPID must be defined!');
  process.exit(1); // Stop server if critical envs are missing
}

// Prepare allowed origins
const allowedOrigins = FRONTEND_ORIGIN.split(',').map(origin => origin.trim());

// CORS setup
app.use(cors({
  origin: (origin, callback) => {
    console.log('🟢 Incoming request from:', origin);
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      console.error('❌ CORS Rejected:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Middleware
app.use(express.json());

// API routes
app.use('/api', webauthRoutes);

// Root route
app.get('/', (req, res) => {
  res.send('✅ Fingerprint Voting System Backend is Running');
});

// Global error handling (optional but recommended)
app.use((err, req, res, next) => {
  console.error('🔥 Uncaught Error:', err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server is live at: http://localhost:${PORT}`);
  console.log(`🌐 WebAuthn Origin: ${WEBAUTHN_ORIGIN}`);
  console.log(`🌐 WebAuthn RP ID: ${WEBAUTHN_RPID}`);
});
