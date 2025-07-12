const express = require('express');
const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require('@simplewebauthn/server');

const router = express.Router();

// Constants for your deployed domain
const rpName = 'Fingerprint Voting System';
const expectedOrigin = 'https://fingerprint-voting-system-production.up.railway.app';
const expectedRPID = 'fingerprint-voting-system-production.up.railway.app';

let latestChallenge = '';
let storedCredential = null;

// ✅ Generate Registration Options
router.post('/generate-registration-options', (req, res) => {
  const { email, uid } = req.body;

  if (!email || !uid) {
    return res.status(400).json({ error: 'Missing email or uid' });
  }

  const options = generateRegistrationOptions({
    rpName,
    rpID: expectedRPID,
    userID: uid,
    userName: email,
    timeout: 60000,
    attestationType: 'none',
    authenticatorSelection: {
      userVerification: 'preferred',
      authenticatorAttachment: 'platform',
    },
  });

  latestChallenge = options.challenge;
  res.json(options);
});

// ✅ Verify Registration Response
router.post('/verify-registration', async (req, res) => {
  try {
    const verification = await verifyRegistrationResponse({
      response: req.body,
      expectedChallenge: latestChallenge,
      expectedOrigin,
      expectedRPID,
    });

    if (verification.verified) {
      const { credentialID, credentialPublicKey, counter } = verification.registrationInfo;
      storedCredential = { credentialID, credentialPublicKey, counter };
    }

    res.json({ verified: verification.verified });
  } catch (err) {
    console.error('❌ Registration verification failed:', err);
    res.status(400).json({ verified: false, error: err.message });
  }
});

// ✅ Generate Authentication Options
router.post('/generate-authentication-options', (req, res) => {
  if (!storedCredential) {
    return res.status(400).json({ error: 'No credential registered yet.' });
  }

  const options = generateAuthenticationOptions({
    timeout: 60000,
    rpID: expectedRPID,
    allowCredentials: [
      {
        id: storedCredential.credentialID,
        type: 'public-key',
        transports: ['internal'],
      },
    ],
    userVerification: 'preferred',
  });

  latestChallenge = options.challenge;
  res.json(options);
});

// ✅ Verify Authentication Response
router.post('/verify-authentication', async (req, res) => {
  if (!storedCredential) {
    return res.status(400).json({ error: 'No credential stored.' });
  }

  try {
    const verification = await verifyAuthenticationResponse({
      response: req.body,
      expectedChallenge: latestChallenge,
      expectedOrigin,
      expectedRPID,
      authenticator: storedCredential,
    });

    if (verification.verified) {
      storedCredential.counter = verification.authenticationInfo.newCounter;
    }

    res.json({ verified: verification.verified });
  } catch (err) {
    console.error('❌ Authentication verification failed:', err);
    res.status(400).json({ verified: false, error: err.message });
  }
});

module.exports = router;
