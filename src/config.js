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
    pollIntervalSeconds: parseInt(process.env.POLL_INTERVAL_SECONDS) || 30,
    // Don't re-notify for same plane within this many minutes
    notificationCooldownMinutes: parseInt(process.env.COOLDOWN_MINUTES) || 5,
  },

  // OpenSky API (no auth needed for basic usage)
  opensky: {
    baseUrl: 'https://opensky-network.org/api',
  },
};
