const express = require('express');
const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require('@simplewebauthn/server');

const router = express.Router();

// Config values from Railway environment (set in Railway Dashboard)
const rpName = 'Fingerprint Voting System';
const expectedOrigin = process.env.WEBAUTHN_ORIGIN;
const expectedRPID = process.env.WEBAUTHN_RPID;

// In-memory stores (for dev/demo)
const users = new Map();       // userId -> { credentials: [] }
const challenges = new Map();  // userId -> challenge string

// Validate critical env vars
if (!expectedOrigin || !expectedRPID) {
  console.error('❌ Missing WEBAUTHN_ORIGIN or WEBAUTHN_RPID env variables.');
  process.exit(1);
}

// Utility functions
const saveChallenge = (userId, challenge) => challenges.set(userId, challenge);
const getChallenge = (userId) => {
  const challenge = challenges.get(userId);
  challenges.delete(userId);
  return challenge;
};

const saveCredential = (userId, credential) => {
  const user = users.get(userId) || { credentials: [] };
  user.credentials.push(credential);
  users.set(userId, user);
};

const getCredential = (userId, credentialId) => {
  const user = users.get(userId);
  return user?.credentials.find(c => c.credentialID === credentialId) || null;
};

const updateCounter = (userId, credentialId, newCounter) => {
  const user = users.get(userId);
  if (!user) return;
  const credential = user.credentials.find(c => c.credentialID === credentialId);
  if (credential) credential.counter = newCounter;
};

// 1️⃣ Registration Options
router.post('/generate-registration-options', async (req, res) => {
  const { email, uid } = req.body;

  if (!email || !uid) {
    return res.status(400).json({ error: 'Missing email or uid' });
  }

  const userCreds = users.get(uid)?.credentials || [];

  const excludeCredentials = userCreds.map(cred => ({
    id: Buffer.from(cred.credentialID, 'base64url'),
    type: 'public-key',
  }));

  try {
    const options = await generateRegistrationOptions({
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
      excludeCredentials,
    });

    saveChallenge(uid, options.challenge);
    res.json(options);
  } catch (err) {
    console.error('❌ Failed to generate registration options:', err);
    res.status(500).json({ error: 'Failed to generate registration options' });
  }
});

// 2️⃣ Verify Registration Response
router.post('/verify-registration', async (req, res) => {
  const { uid, response } = req.body;

  if (!uid || !response) {
    return res.status(400).json({ error: 'Missing user ID or response' });
  }

  const expectedChallenge = getChallenge(uid);
  if (!expectedChallenge) {
    return res.status(400).json({ error: 'Challenge missing or expired' });
  }

  try {
    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin,
      expectedRPID,
    });

    if (!verification.verified) {
      return res.status(400).json({ verified: false, error: 'Verification failed' });
    }

    const { credentialID, credentialPublicKey, counter } = verification.registrationInfo;
    saveCredential(uid, {
      credentialID,
      credentialPublicKey,
      counter,
    });

    res.json({ verified: true });
  } catch (err) {
    console.error('❌ Registration verification error:', err);
    res.status(500).json({ verified: false, error: err.message });
  }
});

// 3️⃣ Authentication Options
router.post('/generate-authentication-options', async (req, res) => {
  const { uid } = req.body;

  if (!uid) {
    return res.status(400).json({ error: 'Missing uid' });
  }

  const user = users.get(uid);
  if (!user || !user.credentials.length) {
    return res.status(400).json({ error: 'No credentials found for user' });
  }

  const allowCredentials = user.credentials.map(cred => ({
    id: Buffer.from(cred.credentialID, 'base64url'),
    type: 'public-key',
  }));

  try {
    const options = await generateAuthenticationOptions({
      timeout: 60000,
      rpID: expectedRPID,
      allowCredentials,
      userVerification: 'preferred',
    });

    saveChallenge(uid, options.challenge);
    res.json(options);
  } catch (err) {
    console.error('❌ Failed to generate authentication options:', err);
    res.status(500).json({ error: 'Failed to generate authentication options' });
  }
});

// 4️⃣ Verify Authentication Response
router.post('/verify-authentication', async (req, res) => {
  const { uid, response } = req.body;

  if (!uid || !response) {
    return res.status(400).json({ error: 'Missing uid or response' });
  }

  const expectedChallenge = getChallenge(uid);
  if (!expectedChallenge) {
    return res.status(400).json({ error: 'Challenge missing or expired' });
  }

  const credentialId = Buffer.from(response.rawId || response.id, 'base64url').toString('base64url');
  const storedCredential = getCredential(uid, credentialId);

  if (!storedCredential) {
    return res.status(400).json({ error: 'Credential not found' });
  }

  try {
    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin,
      expectedRPID,
      authenticator: {
        credentialID: storedCredential.credentialID,
        credentialPublicKey: storedCredential.credentialPublicKey,
        counter: storedCredential.counter,
      },
    });

    if (!verification.verified) {
      return res.status(400).json({ verified: false, error: 'Verification failed' });
    }

    updateCounter(uid, storedCredential.credentialID, verification.authenticationInfo.newCounter);
    res.json({ verified: true });
  } catch (err) {
    console.error('❌ Authentication verification error:', err);
    res.status(500).json({ verified: false, error: err.message });
  }
});

module.exports = router;
