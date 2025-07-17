const express = require('express');
const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require('@simplewebauthn/server');

const router = express.Router();

const rpName = 'Fingerprint Voting System'; // Your app's display name
const expectedOrigin = process.env.WEBAUTHN_ORIGIN; // The exact URL of your deployed backend (e.g., https://your-backend-xxxx.up.railway.app)
const expectedRPID = process.env.WEBAUTHN_RPID;     // The domain of your deployed backend (e.g., your-backend-xxxx.up.railway.app)


const mockDb = {
  users: new Map(), // Stores user data including credentials
  challenges: new Map() // Stores challenges per user ID/session ID temporarily
};

// Helper function to simulate saving/retrieving data from DB
const saveUserCredential = (userId, credentialInfo) => {
  const user = mockDb.users.get(userId) || { credentials: [] };
  // In a real DB, you'd update or add this credential for the user
  user.credentials.push(credentialInfo);
  mockDb.users.set(userId, user);
  console.log(`[MOCK_DB] Saved credential for user ${userId}`);
};

const getUserCredential = (userId, credentialId) => {
  const user = mockDb.users.get(userId);
  if (user && user.credentials) {
    return user.credentials.find(cred => cred.credentialID === credentialId);
  }
  return null;
};

const updateCredentialCounter = (userId, credentialId, newCounter) => {
  const user = mockDb.users.get(userId);
  if (user && user.credentials) {
    const credential = user.credentials.find(cred => cred.credentialID === credentialId);
    if (credential) {
      credential.counter = newCounter;
      console.log(`[MOCK_DB] Updated counter for credential ${credentialId} to ${newCounter}`);
    }
  }
};

const saveChallenge = (userId, challenge) => {
    // In a real DB, this might be stored with an expiry
    mockDb.challenges.set(userId, challenge);
    console.log(`[MOCK_DB] Saved challenge for user ${userId}`);
};

const getChallenge = (userId) => {
    const challenge = mockDb.challenges.get(userId);
    // In a real DB, you'd also delete it after retrieval to prevent replay attacks
    mockDb.challenges.delete(userId); // Consume the challenge
    console.log(`[MOCK_DB] Retrieved and consumed challenge for user ${userId}`);
    return challenge;
};
// --- END CONCEPTUAL MOCK DATABASE ---

// Check if critical environment variables are set on server startup
if (!expectedOrigin || !expectedRPID) {
  console.error("❌ ERROR: WEBAUTHN_ORIGIN and WEBAUTHN_RPID environment variables must be set for WebAuthn to function!");
  console.error("Please configure them in your Railway project's 'Variables' tab.");

}

// ✅ Generate Registration Options
router.post('/generate-registration-options', async (req, res) => {
  const { email, uid } = req.body; // Assuming uid is a unique user identifier

  if (!email || !uid) {
    return res.status(400).json({ error: 'Missing email or uid' });
  }

  // In a real app, you'd fetch any existing credentials for this uid from your DB
  // to prevent re-registration of the same authenticator.
  const existingCredentials = (mockDb.users.get(uid)?.credentials || []).map(cred => ({
    id: Buffer.from(cred.credentialID, 'base64url'), // Convert to Buffer
    type: 'public-key',
  }));

  try {
    const options = await generateRegistrationOptions({
      rpName,
      rpID: expectedRPID,
      userID: uid, // User's unique ID
      userName: email, // User's display name (can be email)
      timeout: 60000,
      attestationType: 'none',
      authenticatorSelection: {
        userVerification: 'preferred',
        authenticatorAttachment: 'platform', // Or 'cross-platform' for USB/NFC keys
      },
      excludeCredentials: existingCredentials, // Prevent re-registration of existing keys
    });

    // Store the challenge associated with the user/session ID in your database.
    // This challenge MUST be unique for each registration attempt and consumed after use.
    saveChallenge(uid, options.challenge); // Using mockDb

    res.json(options);
  } catch (error) {
    console.error('❌ Error generating registration options:', error);
    res.status(500).json({ error: 'Failed to generate registration options' });
  }
});

// ✅ Verify Registration Response
router.post('/verify-registration', async (req, res) => {
  const { uid, response } = req.body;

  if (!uid || !response) {
    return res.status(400).json({ error: 'Missing user ID or response' });
  }

  // Retrieve the expected challenge for this user
  const expectedChallenge = getChallenge(uid); // Use your own db or mockDb

  if (!expectedChallenge) {
    return res.status(400).json({ error: 'No active challenge found or challenge expired/reused.' });
  }

  try {
    const verification = await verifyRegistrationResponse({
      response: response,
      expectedChallenge,
      expectedOrigin: 'https://ravishing-playfulness-production.up.railway.app', // Replace with your backend URL
      expectedRPID: 'ravishing-playfulness-production.up.railway.app', // Must match RPID used during registration
    });

    if (verification.verified) {
      const { credentialID, credentialPublicKey, counter } = verification.registrationInfo;

      // Save credential info for the user
      saveUserCredential(uid, {
        credentialID,
        credentialPublicKey,
        counter,
      });

      return res.json({ verified: true });
    } else {
      return res.status(400).json({ verified: false, error: 'Registration verification failed.' });
    }

  } catch (err) {
    console.error('❌ Registration verification failed:', err);
    return res.status(400).json({ verified: false, error: err.message });
  }
});


// ✅ Generate Authentication Options
router.post('/generate-authentication-options', async (req, res) => {
  const { uid } = req.body; // Assuming you identify the user somehow before authentication

  if (!uid) {
    return res.status(400).json({ error: 'Missing user ID' });
  }

  // Retrieve all registered credentials for this user from your database
  const user = mockDb.users.get(uid); // Using mockDb
  if (!user || !user.credentials || user.credentials.length === 0) {
    return res.status(400).json({ error: 'No credential registered for this user yet.' });
  }

  const allowCredentials = user.credentials.map(cred => ({
    id: Buffer.from(cred.credentialID, 'base64url'), // Convert to Buffer
    type: 'public-key',
    // Optionally include transports if you saved them during registration
    // transports: cred.transports,
  }));

  try {
    const options = await generateAuthenticationOptions({
      timeout: 60000,
      rpID: expectedRPID,
      allowCredentials,
      userVerification: 'preferred',
    });

    // Store the challenge associated with the user/session ID in your database.
    saveChallenge(uid, options.challenge); // Using mockDb

    res.json(options);
  } catch (error) {
    console.error('❌ Error generating authentication options:', error);
    res.status(500).json({ error: 'Failed to generate authentication options' });
  }
});

// ✅ Verify Authentication Response
router.post('/verify-authentication', async (req, res) => {
  const { uid, response } = req.body;

  if (!uid || !response) {
    return res.status(400).json({ error: 'Missing user ID or response' });
  }

  // Retrieve the challenge from your database (associated with this uid/session)
  const expectedChallenge = getChallenge(uid); // Using mockDb

  if (!expectedChallenge) {
    return res.status(400).json({ error: 'No active challenge found or challenge expired/reused.' });
  }

  
  const credentialIdBuffer = Buffer.from(response.rawId || response.id, 'base64url');
  const storedCredential = getUserCredential(uid, credentialIdBuffer.toString('base64url')); // Using mockDb

  if (!storedCredential) {
    return res.status(400).json({ error: 'No matching credential found for this user.' });
  }

  try {
    const verification = await verifyAuthenticationResponse({
      response: req.body,
      expectedChallenge,
      expectedOrigin,
      expectedRPID,
      authenticator: {
        credentialID: storedCredential.credentialID,
        credentialPublicKey: storedCredential.credentialPublicKey,
        counter: storedCredential.counter,
        // Add any other properties of the authenticator if stored and needed for verification
      },
    });

    if (verification.verified) {
      // Update the counter in your database for the authenticated credential
      updateCredentialCounter(uid, storedCredential.credentialID, verification.authenticationInfo.newCounter); // Using mockDb
      res.json({ verified: true });
    } else {
      res.status(400).json({ verified: false, error: 'Authentication verification failed.' });
    }
  } catch (err) {
    console.error('❌ Authentication verification failed:', err);
    res.status(400).json({ verified: false, error: err.message });
  }
});

module.exports = router;