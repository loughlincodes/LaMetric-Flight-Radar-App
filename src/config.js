const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

module.exports = {
  // LaMetric Device Configuration
  lametric: {
    deviceIp: process.env.LAMETRIC_DEVICE_IP || '192.168.178.157',
    apiKey: process.env.LAMETRIC_API_KEY,
  },

  // Home location for flight tracking
  home: {
    latitude: parseFloat(process.env.HOME_LATITUDE) || 53.313912009645804,
    longitude: parseFloat(process.env.HOME_LONGITUDE) || -6.287110040207438,
  },

  // Tracking configuration
  tracking: {
    radiusMiles: parseFloat(process.env.RADIUS_MILES) || 10,
    pollIntervalSeconds: parseInt(process.env.POLL_INTERVAL_SECONDS) || 60,
    notificationCooldownMinutes: parseInt(process.env.COOLDOWN_MINUTES) || 5,
    // Fetch aircraft type/model (uses extra API credits per aircraft)
    fetchMetadata: process.env.FETCH_AIRCRAFT_METADATA === 'true',
  },

  // OpenSky API Configuration
  opensky: {
    baseUrl: 'https://opensky-network.org/api',
    // Optional authentication (10x more API credits)
    username: process.env.OPENSKY_USERNAME || null,
    password: process.env.OPENSKY_PASSWORD || null,
  },
};
