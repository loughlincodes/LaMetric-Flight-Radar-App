/**
 * LaMetric Polling Server
 *
 * Exposes a JSON endpoint that LaMetric can poll for flight data.
 * Works with the "My Data DIY" app or custom Indicator Apps.
 *
 * Usage: npm run server
 */

const express = require('express');
const config = require('./config');
const OpenSkyClient = require('./opensky-client');
const { filterByDistance } = require('./distance');

const app = express();
const opensky = new OpenSkyClient();

// Cache to avoid hammering OpenSky API
let cachedData = null;
let lastFetch = 0;
const CACHE_TTL = 15000; // 15 seconds

/**
 * Fetch nearby flights (with caching)
 */
async function getNearbyFlights() {
  const now = Date.now();

  if (cachedData && (now - lastFetch) < CACHE_TTL) {
    return cachedData;
  }

  const { latitude, longitude } = config.home;
  const radiusMiles = config.tracking.radiusMiles;

  try {
    const aircraft = await opensky.getAircraftNear(latitude, longitude, radiusMiles);
    const nearby = filterByDistance(aircraft, latitude, longitude, radiusMiles);

    cachedData = nearby;
    lastFetch = now;
    return nearby;
  } catch (error) {
    console.error('Error fetching flights:', error.message);
    return cachedData || [];
  }
}

/**
 * Format altitude for display
 */
function formatAltitude(meters) {
  const feet = meters ? Math.round(meters * 3.28084) : null;
  if (!feet) return '?';
  if (feet >= 10000) return `${(feet / 1000).toFixed(0)}k`;
  return `${Math.round(feet / 100) * 100}`;
}

/**
 * LaMetric JSON endpoint
 *
 * Format for "My Data DIY" app:
 * https://help.lametric.com/support/solutions/articles/6000225467-my-data-diy
 */
app.get('/lametric', async (req, res) => {
  console.log(`📡 ${new Date().toISOString()} - LaMetric polling...`);

  const flights = await getNearbyFlights();

  if (flights.length === 0) {
    // No flights - show a simple message
    return res.json({
      frames: [
        {
          text: "No planes",
          icon: "i2234"
        }
      ]
    });
  }

  // Show the closest flight
  const closest = flights[0];
  const callsign = closest.callsign || closest.icao24;
  const altitude = formatAltitude(closest.baroAltitude || closest.geoAltitude);
  const distance = closest.distanceMiles.toFixed(1);

  console.log(`   ✈️ ${callsign} at ${altitude}ft, ${distance}mi away`);

  res.json({
    frames: [
      {
        text: callsign,
        icon: "i2234"  // airplane icon
      },
      {
        text: `${altitude}ft`,
        icon: "i3269"  // altitude icon
      },
      {
        text: `${distance}mi`,
        icon: "i2283"  // distance icon
      }
    ]
  });
});

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', mode: 'polling' });
});

/**
 * Debug endpoint - shows all nearby flights
 */
app.get('/flights', async (req, res) => {
  const flights = await getNearbyFlights();
  res.json({
    count: flights.length,
    radius: config.tracking.radiusMiles,
    home: config.home,
    flights: flights.map(f => ({
      callsign: f.callsign || f.icao24,
      altitude: Math.round((f.baroAltitude || f.geoAltitude || 0) * 3.28084),
      distance: f.distanceMiles.toFixed(2),
      latitude: f.latitude,
      longitude: f.longitude
    }))
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('🛫 LaMetric Flight Tracker Server');
  console.log('=================================');
  console.log(`📍 Home: ${config.home.latitude.toFixed(4)}, ${config.home.longitude.toFixed(4)}`);
  console.log(`📏 Radius: ${config.tracking.radiusMiles} miles`);
  console.log('');
  console.log(`🌐 Endpoints:`);
  console.log(`   http://localhost:${PORT}/lametric  - LaMetric JSON`);
  console.log(`   http://localhost:${PORT}/flights   - Debug view`);
  console.log(`   http://localhost:${PORT}/health    - Health check`);
  console.log('');
  console.log(`📱 Configure "My Data DIY" app on LaMetric to poll:`);
  console.log(`   http://<your-mac-ip>:${PORT}/lametric`);
  console.log('');
});
