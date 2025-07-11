const express = require('express');
const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require('@simplewebauthn/server');

const router = express.Router();

let mockDB = {}; // In production, replace with actual DB

// Replace with your actual domain
const rpName = 'Fingerprint Voting System';
const expectedOrigin = 'https://fingerprint-voting-syste-7687a.web.app';
const expectedRPID = 'fingerprint-voting-syste-7687a.web.app';

// ✅ Generate registration options
router.post('/generate-registration-options', (req, res) => {
  const user = {
    id: 'user-id-123',
    name: 'user@example.com',
    displayName: 'Mukesh',
  };

  const options = generateRegistrationOptions({
    rpName,
    rpID: expectedRPID,
    userID: user.id,
    userName: user.name,
    timeout: 60000,
    attestationType: 'none',
    authenticatorSelection: {
      userVerification: 'preferred',
      authenticatorAttachment: 'platform',
    },
  });

  // Save challenge temporarily (use DB in production)
  mockDB.challenge = options.challenge;
  mockDB.user = user;

  res.json(options);
});

// ✅ Verify registration response
router.post('/verify-registration', async (req, res) => {
  const body = req.body;

  try {
    const verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge: mockDB.challenge,
      expectedOrigin,
      expectedRPID,
    });

    if (verification.verified) {
      const { credentialPublicKey, credentialID, counter } = verification.registrationInfo;

      mockDB.credential = {
        credentialID,
        credentialPublicKey,
        counter,
      };
    }

    res.json({ verified: verification.verified });
  } catch (err) {
    console.error('Registration verification failed:', err);
    res.status(400).json({ verified: false, error: err.message });
  }
});

// ✅ Generate authentication options
router.post('/generate-authentication-options', (req, res) => {
  if (!mockDB.credential?.credentialID) {
    return res.status(400).json({ error: 'No credential registered yet.' });
  }

  const options = generateAuthenticationOptions({
    timeout: 60000,
    rpID: expectedRPID,
    allowCredentials: [
      {
        id: mockDB.credential.credentialID,
        type: 'public-key',
        transports: ['internal'],
      },
    ],
    userVerification: 'preferred',
  });

  mockDB.challenge = options.challenge;

  res.json(options);
});

// ✅ Verify authentication response
router.post('/verify-authentication', async (req, res) => {
  try {
    const verification = await verifyAuthenticationResponse({
      response: req.body,
      expectedChallenge: mockDB.challenge,
      expectedOrigin,
      expectedRPID,
      authenticator: {
        credentialID: mockDB.credential.credentialID,
        credentialPublicKey: mockDB.credential.credentialPublicKey,
        counter: mockDB.credential.counter,
      },
    });

    if (verification.verified) {
      // Update counter for future verification
      mockDB.credential.counter = verification.authenticationInfo.newCounter;
    }

    res.json({ verified: verification.verified });
  } catch (err) {
    console.error('Authentication verification failed:', err);
    res.status(400).json({ verified: false, error: err.message });
  }
});

module.exports = router;
