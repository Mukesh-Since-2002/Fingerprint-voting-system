import React from 'react';
import { startAuthentication } from '@simplewebauthn/browser';

const LoginWithFingerprint = () => {
  const handleAuth = async () => {
    try {
      // Step 1: Get authentication options from server
      const resp = await fetch('http://localhost:5000/api/generate-authentication-options');
      const options = await resp.json();

      // Step 2: Use browser fingerprint scanner (WebAuthn)
      const assertionResp = await startAuthentication(options);

      // Step 3: Send response to server for verification
      const verify = await fetch('http://localhost:5000/api/verify-authentication', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assertionResp),
      });

      const result = await verify.json();
      if (result.verified) {
        alert('✅ Authenticated successfully!');
      } else {
        alert('❌ Authentication failed.');
      }
    } catch (err) {
      console.error('Error during authentication:', err);
      alert('Error: Fingerprint authentication failed.');
    }
  };

  return (
    <button onClick={handleAuth} style={{ padding: '10px', marginTop: '20px' }}>
      Login with Fingerprint
    </button>
  );
};

export default LoginWithFingerprint;
