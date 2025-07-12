// webauth.js

const express = require('express');
const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require('@simplewebauthn/server');

const router = express.Router();

// Mock DB (replace with real DB in production)
let mockDB = {};

// RP configuration (Railway domain)
const rpName = 'Fingerprint Voting System';
const expectedOrigin = 'https://fingerprint-voting-system-production.up.railway.app';
const expectedRPID = 'fingerprint-voting-system-production.up.railway.app';

/**
 * 🔐 Generate WebAuthn Registration Options
 */
router.post('/generate-registration-options', (req, res) => {
  const { email, uid } = req.body;

  if (!email || !uid) {
    return res.status(400).json({ error: 'Missing email or uid' });
  }

  const user = {
    id: uid,
    name: email,
    displayName: email.split('@')[0],
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
    excludeCredentials: mockDB[uid]?.devices?.map((cred) => ({
      id: cred.credentialID,
      type: 'public-key',
      transports: ['internal'],
    })) || [],
  });

  mockDB[uid] = {
    challenge: options.challenge,
    user,
  };

  res.json(options);
});

/**
 * ✅ Verify Registration Response
 */
router.post('/verify-registration', async (req, res) => {
  const response = req.body;

  const uid = response?.response?.userHandle;

  if (!uid || !mockDB[uid]?.challenge) {
    return res.status(400).json({ error: 'User data not found for verification' });
  }

  try {
    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: mockDB[uid].challenge,
      expectedOrigin,
      expectedRPID,
    });

    if (verification.verified) {
      const { credentialPublicKey, credentialID, counter } = verification.registrationInfo;

      mockDB[uid].credential = {
        credentialID,
        credentialPublicKey,
        counter,
      };
    }

    res.json({ verified: verification.verified });
  } catch (err) {
    console.error('❌ Registration verification failed:', err);
    res.status(400).json({ verified: false, error: err.message });
  }
});

/**
 * 🔓 Generate Authentication Options
 */
router.post('/generate-authentication-options', (req, res) => {
  const { uid } = req.body;

  const userData = mockDB[uid];
  if (!userData?.credential) {
    return res.status(400).json({ error: 'No registered credentials found' });
  }

  const options = generateAuthenticationOptions({
    timeout: 60000,
    rpID: expectedRPID,
    allowCredentials: [
      {
        id: userData.credential.credentialID,
        type: 'public-key',
        transports: ['internal'],
      },
    ],
    userVerification: 'preferred',
  });

  mockDB[uid].challenge = options.challenge;

  res.json(options);
});

/**
 * ✅ Verify Authentication Response
 */
router.post('/verify-authentication', async (req, res) => {
  const response = req.body;
  const uid = response?.response?.userHandle;

  const userData = mockDB[uid];

  if (!userData || !userData.credential) {
    return res.status(400).json({ error: 'User or credential not found' });
  }

  try {
    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: userData.challenge,
      expectedOrigin,
      expectedRPID,
      authenticator: userData.credential,
    });

    if (verification.verified) {
      // Update counter to prevent replay attacks
      userData.credential.counter = verification.authenticationInfo.newCounter;
    }

    res.json({ verified: verification.verified });
  } catch (err) {
    console.error('❌ Authentication verification failed:', err);
    res.status(400).json({ verified: false, error: err.message });
  }
});

module.exports = router;
