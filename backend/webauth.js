const express = require('express');
const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require('@simplewebauthn/server');

const router = express.Router();

// Static values instead of process.env (since you're not using .env)
const rpName = 'Fingerprint Voting System';
const expectedOrigin = 'https://ravishing-playfulness-production.up.railway.app';
const expectedRPID = 'ravishing-playfulness-production.up.railway.app';

// Mock in-memory DB (replace with real DB for production)
const mockDb = {
  users: new Map(),
  challenges: new Map()
};

const saveUserCredential = (userId, credentialInfo) => {
  const user = mockDb.users.get(userId) || { credentials: [] };
  user.credentials.push(credentialInfo);
  mockDb.users.set(userId, user);
};

const getUserCredential = (userId, credentialId) => {
  const user = mockDb.users.get(userId);
  return user?.credentials?.find(cred => cred.credentialID === credentialId) || null;
};

const updateCredentialCounter = (userId, credentialId, newCounter) => {
  const user = mockDb.users.get(userId);
  const credential = user?.credentials?.find(cred => cred.credentialID === credentialId);
  if (credential) credential.counter = newCounter;
};

const saveChallenge = (userId, challenge) => {
  mockDb.challenges.set(userId, challenge);
};

const getChallenge = (userId) => {
  const challenge = mockDb.challenges.get(userId);
  mockDb.challenges.delete(userId);
  return challenge;
};

// 🚀 Routes

// Generate Registration Options
router.post('/generate-registration-options', async (req, res) => {
  const { email, uid } = req.body;
  if (!email || !uid) return res.status(400).json({ error: 'Missing email or uid' });

  const existingCredentials = (mockDb.users.get(uid)?.credentials || []).map(cred => ({
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
      excludeCredentials: existingCredentials,
    });

    saveChallenge(uid, options.challenge);
    res.json(options);
  } catch (error) {
    console.error('❌ Error generating registration options:', error);
    res.status(500).json({ error: 'Failed to generate registration options' });
  }
});

// Verify Registration Response
router.post('/verify-registration', async (req, res) => {
  const { uid, response } = req.body;
  if (!uid || !response) return res.status(400).json({ error: 'Missing user ID or response' });

  const expectedChallenge = getChallenge(uid);
  if (!expectedChallenge) return res.status(400).json({ error: 'No active challenge found or challenge expired/reused.' });

  try {
    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin,
      expectedRPID,
    });

    if (verification.verified) {
      const { credentialID, credentialPublicKey, counter } = verification.registrationInfo;
      saveUserCredential(uid, { credentialID, credentialPublicKey, counter });
      return res.json({ verified: true });
    } else {
      return res.status(400).json({ verified: false, error: 'Registration verification failed.' });
    }
  } catch (err) {
    console.error('❌ Registration verification failed:', err);
    res.status(400).json({ verified: false, error: err.message });
  }
});

// Generate Authentication Options
router.post('/generate-authentication-options', async (req, res) => {
  const { uid } = req.body;
  if (!uid) return res.status(400).json({ error: 'Missing user ID' });

  const user = mockDb.users.get(uid);
  if (!user || !user.credentials.length) {
    return res.status(400).json({ error: 'No credential registered for this user yet.' });
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
  } catch (error) {
    console.error('❌ Error generating authentication options:', error);
    res.status(500).json({ error: 'Failed to generate authentication options' });
  }
});

// Verify Authentication Response
router.post('/verify-authentication', async (req, res) => {
  const { uid, response } = req.body;
  if (!uid || !response) return res.status(400).json({ error: 'Missing user ID or response' });

  const expectedChallenge = getChallenge(uid);
  if (!expectedChallenge) return res.status(400).json({ error: 'No active challenge found or challenge expired/reused.' });

  const credentialIdBuffer = Buffer.from(response.rawId || response.id, 'base64url');
  const storedCredential = getUserCredential(uid, credentialIdBuffer.toString('base64url'));

  if (!storedCredential) {
    return res.status(400).json({ error: 'No matching credential found for this user.' });
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

    if (verification.verified) {
      updateCredentialCounter(uid, storedCredential.credentialID, verification.authenticationInfo.newCounter);
      return res.json({ verified: true });
    } else {
      return res.status(400).json({ verified: false, error: 'Authentication verification failed.' });
    }
  } catch (err) {
    console.error('❌ Authentication verification failed:', err);
    res.status(400).json({ verified: false, error: err.message });
  }
});

module.exports = router;
