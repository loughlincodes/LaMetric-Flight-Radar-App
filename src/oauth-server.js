/**
 * OAuth2 Setup Server for LaMetric
 *
 * Run this once to obtain access and refresh tokens.
 * Usage: npm run auth
 */

const express = require('express');
const axios = require('axios');
const config = require('./config');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Store for OAuth state
let authState = null;

// Generate random state for OAuth security
function generateState() {
  return Math.random().toString(36).substring(2, 15);
}

// Build the authorization URL
function getAuthUrl() {
  const state = generateState();
  authState = state;

  // Request all needed scopes for device access and notifications
  const params = new URLSearchParams({
    client_id: config.lametric.clientId,
    redirect_uri: config.lametric.redirectUri,
    response_type: 'code',
    scope: 'basic devices_read devices_write',
    state: state,
  });

  return `${config.lametric.authUrl}?${params.toString()}`;
}

// Exchange authorization code for tokens
async function exchangeCodeForTokens(code) {
  const response = await axios.post(config.lametric.tokenUrl, {
    client_id: config.lametric.clientId,
    client_secret: config.lametric.clientSecret,
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: config.lametric.redirectUri,
  }, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  return response.data;
}

// Get user's devices
async function getDevices(accessToken) {
  const response = await axios.get(`${config.lametric.apiBaseUrl}/users/me/devices`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  return response.data;
}

// OAuth callback route
app.get('/', async (req, res) => {
  const { code, state, error } = req.query;

  // Initial page - show auth link
  if (!code && !error) {
    const authUrl = getAuthUrl();
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>LaMetric OAuth Setup</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              max-width: 600px;
              margin: 50px auto;
              padding: 20px;
              background: #1a1a2e;
              color: #eee;
            }
            h1 { color: #00d4aa; }
            a.button {
              display: inline-block;
              background: #00d4aa;
              color: #1a1a2e;
              padding: 15px 30px;
              text-decoration: none;
              border-radius: 8px;
              font-weight: bold;
              margin: 20px 0;
            }
            a.button:hover { background: #00b894; }
            .step {
              background: #16213e;
              padding: 15px;
              border-radius: 8px;
              margin: 10px 0;
            }
            code {
              background: #0f0f23;
              padding: 2px 6px;
              border-radius: 4px;
              color: #00d4aa;
            }
          </style>
        </head>
        <body>
          <h1>🛫 LaMetric Flight Tracker</h1>
          <h2>OAuth Setup</h2>

          <div class="step">
            <strong>Step 1:</strong> Click the button below to authorize with LaMetric
          </div>

          <a href="${authUrl}" class="button">Authorize with LaMetric →</a>

          <div class="step">
            <strong>Step 2:</strong> After authorizing, you'll be redirected back here
          </div>

          <div class="step">
            <strong>Step 3:</strong> Copy the environment variables to your <code>.env</code> file
          </div>
        </body>
      </html>
    `);
    return;
  }

  // Handle error
  if (error) {
    res.send(`
      <h1>Error</h1>
      <p>Authorization failed: ${error}</p>
      <a href="/">Try again</a>
    `);
    return;
  }

  // Verify state
  if (state !== authState) {
    res.send(`
      <h1>Error</h1>
      <p>State mismatch - possible CSRF attack. Please try again.</p>
      <a href="/">Start over</a>
    `);
    return;
  }

  try {
    // Exchange code for tokens
    console.log('Exchanging code for tokens...');
    const tokens = await exchangeCodeForTokens(code);

    console.log('Tokens received:', Object.keys(tokens));

    // Try to get devices, but don't fail if we can't
    let device = null;
    let deviceError = null;
    try {
      console.log('Getting devices...');
      const devices = await getDevices(tokens.access_token);
      device = devices.find(d => d.type === 'lametric_time') || devices[0];
    } catch (err) {
      console.log('Could not fetch devices:', err.response?.data || err.message);
      deviceError = err.response?.data || err.message;
    }

    // Success! Show the tokens (even if we couldn't get devices)
    const envContent = `
# LaMetric OAuth2 Credentials
LAMETRIC_CLIENT_ID=${config.lametric.clientId}
LAMETRIC_CLIENT_SECRET=${config.lametric.clientSecret}
LAMETRIC_REDIRECT_URI=${config.lametric.redirectUri}

# LaMetric Tokens (obtained ${new Date().toISOString()})
LAMETRIC_ACCESS_TOKEN=${tokens.access_token}
LAMETRIC_REFRESH_TOKEN=${tokens.refresh_token || 'NOT_PROVIDED'}
LAMETRIC_DEVICE_ID=${device ? device.id : 'NEED_TO_FIND_MANUALLY'}

# Home Location
HOME_LATITUDE=53.313912009645804
HOME_LONGITUDE=-6.287110040207438

# Tracking Configuration
RADIUS_MILES=2
POLL_INTERVAL_SECONDS=30
`.trim();

    // Also log to console
    console.log('\n========================================');
    console.log('✅ SUCCESS! OAuth tokens obtained!');
    console.log('========================================\n');
    if (device) {
      console.log('Device found:', device.name, `(ID: ${device.id})`);
    } else {
      console.log('⚠️  Could not fetch devices automatically.');
      console.log('    You may need to find your device ID manually.');
    }
    console.log('\nAdd these to your .env file:\n');
    console.log(envContent);
    console.log('\n========================================\n');

    const deviceInfo = device
      ? `<div class="device"><strong>Device found:</strong> ${device.name}<br><strong>Device ID:</strong> ${device.id}</div>`
      : `<div class="device warning"><strong>⚠️ Could not fetch device automatically</strong><br>
         You may need to find your Device ID in the LaMetric app or try with scopes.<br>
         Error: ${JSON.stringify(deviceError)}</div>`;

    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Success! - LaMetric OAuth Setup</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              max-width: 800px;
              margin: 50px auto;
              padding: 20px;
              background: #1a1a2e;
              color: #eee;
            }
            h1 { color: #00d4aa; }
            .success {
              background: #00d4aa22;
              border: 2px solid #00d4aa;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
            }
            .device {
              background: #16213e;
              padding: 15px;
              border-radius: 8px;
              margin: 10px 0;
            }
            .device.warning {
              background: #3d2914;
              border: 1px solid #f0a500;
            }
            pre {
              background: #0f0f23;
              padding: 20px;
              border-radius: 8px;
              overflow-x: auto;
              font-size: 12px;
              line-height: 1.5;
            }
            .copy-btn {
              background: #00d4aa;
              color: #1a1a2e;
              border: none;
              padding: 10px 20px;
              border-radius: 5px;
              cursor: pointer;
              font-weight: bold;
            }
            .copy-btn:hover { background: #00b894; }
            .next-steps {
              background: #16213e;
              padding: 20px;
              border-radius: 8px;
              margin-top: 20px;
            }
            .next-steps li { margin: 10px 0; }
            code { color: #00d4aa; }
          </style>
        </head>
        <body>
          <h1>✅ Success!</h1>

          <div class="success">
            <strong>OAuth authorization complete!</strong>
          </div>

          ${deviceInfo}

          <h2>Copy this to your .env file:</h2>
          <pre id="env-content">${envContent}</pre>
          <button class="copy-btn" onclick="navigator.clipboard.writeText(document.getElementById('env-content').innerText); this.innerText='Copied!';">
            Copy to Clipboard
          </button>

          <div class="next-steps">
            <h3>Next Steps:</h3>
            <ol>
              <li>Create a <code>.env</code> file in your project root</li>
              <li>Paste the content above into that file</li>
              <li>Stop this server (Ctrl+C in terminal)</li>
              <li>Run <code>npm run test-push</code> to test notifications</li>
              <li>Run <code>npm start</code> to start flight tracking</li>
            </ol>
          </div>
        </body>
      </html>
    `);

  } catch (err) {
    console.error('OAuth error:', err.response?.data || err.message);
    res.send(`
      <h1>Error</h1>
      <p>Failed to exchange code for tokens:</p>
      <pre>${JSON.stringify(err.response?.data || err.message, null, 2)}</pre>
      <a href="/">Try again</a>
    `);
  }
});

// Start server
app.listen(PORT, async () => {
  console.log('\n🔐 LaMetric OAuth Setup Server');
  console.log('==============================\n');

  if (!config.lametric.clientId || !config.lametric.clientSecret) {
    console.log('❌ Error: LAMETRIC_CLIENT_ID and LAMETRIC_CLIENT_SECRET not set!');
    console.log('');
    console.log('Create a .env file with:');
    console.log('  LAMETRIC_CLIENT_ID=your-client-id');
    console.log('  LAMETRIC_CLIENT_SECRET=your-client-secret');
    console.log('');
    process.exit(1);
  }

  console.log(`Server running at http://localhost:${PORT}`);
  console.log('');
  console.log('Opening browser for OAuth authorization...');
  console.log('(If browser doesn\'t open, go to http://localhost:3000)');
  console.log('');

  // Try to open browser
  try {
    const open = (await import('open')).default;
    await open(`http://localhost:${PORT}`);
  } catch (err) {
    console.log('Could not auto-open browser. Please go to:');
    console.log(`  http://localhost:${PORT}`);
  }
});
