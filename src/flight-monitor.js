/**
 * Flight Monitor
 *
 * Polls OpenSky for nearby aircraft and sends notifications to LaMetric.
 */

const config = require('./config');
const OpenSkyClient = require('./opensky-client');
const LaMetricClient = require('./lametric-client');
const { filterByDistance } = require('./distance');

class FlightMonitor {
  constructor() {
    this.opensky = new OpenSkyClient();
    this.lametric = new LaMetricClient();
    this.notifiedFlights = new Map(); // Track recently notified flights
    this.isRunning = false;
    this.pollInterval = null;
  }

  /**
   * Check if we should notify for this flight
   */
  shouldNotify(icao24) {
    const lastNotified = this.notifiedFlights.get(icao24);
    const cooldownMs = config.tracking.notificationCooldownMinutes * 60 * 1000;

    if (lastNotified && Date.now() - lastNotified < cooldownMs) {
      return false;
    }

    return true;
  }

  /**
   * Mark a flight as notified
   */
  markNotified(icao24) {
    this.notifiedFlights.set(icao24, Date.now());

    // Clean up old entries
    const maxAge = config.tracking.notificationCooldownMinutes * 60 * 1000 * 2;
    for (const [key, time] of this.notifiedFlights) {
      if (Date.now() - time > maxAge) {
        this.notifiedFlights.delete(key);
      }
    }
  }

  /**
   * Poll for nearby aircraft and notify
   */
  async poll() {
    const { latitude, longitude } = config.home;
    const radiusMiles = config.tracking.radiusMiles;

    try {
      // Get aircraft in the bounding box
      const aircraft = await this.opensky.getAircraftNear(latitude, longitude, radiusMiles);

      if (aircraft.length === 0) {
        console.log('   No aircraft in bounding box');
        return;
      }

      // Filter by exact distance (Haversine)
      const nearby = filterByDistance(aircraft, latitude, longitude, radiusMiles);

      if (nearby.length === 0) {
        console.log('   No aircraft within radius');
        return;
      }

      console.log(`✈️  ${nearby.length} aircraft within ${radiusMiles} miles:`);

      for (const plane of nearby) {
        // Skip if recently notified
        if (!this.shouldNotify(plane.icao24)) {
          const callsign = plane.callsign || plane.icao24;
          console.log(`   - ${callsign}: (skipped - recently notified)`);
          continue;
        }

        // Fetch aircraft metadata (type, etc.)
        const enriched = await this.opensky.enrichWithMetadata(plane);

        const callsign = enriched.callsign || enriched.icao24;
        const altitude = OpenSkyClient.metersToFeet(enriched.baroAltitude || enriched.geoAltitude);
        const typecode = enriched.typecode;
        const distance = plane.distanceMiles;

        // Log what we found
        const typeInfo = typecode ? ` (${typecode})` : '';
        console.log(`   - ${callsign}${typeInfo}: ${altitude ? altitude.toLocaleString() + ' ft' : 'ground'}, ${distance.toFixed(1)} mi`);

        // Send notification to LaMetric
        this.lametric.pushFlightNotification({
          callsign,
          altitude,
          typecode,
          distance,
          // Route info would go here if we had it
          // origin: null,
          // destination: null,
        });

        this.markNotified(plane.icao24);

        // Small delay between notifications to not overwhelm
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error('❌ Poll error:', error.message);
    }
  }

  /**
   * Start the flight monitor
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️  Monitor already running');
      return;
    }

    console.log('🛫 Flight Monitor Starting');
    console.log('==========================');
    console.log(`📍 Home: ${config.home.latitude.toFixed(4)}, ${config.home.longitude.toFixed(4)}`);
    console.log(`📏 Radius: ${config.tracking.radiusMiles} miles`);
    console.log(`⏱️  Poll interval: ${config.tracking.pollIntervalSeconds} seconds`);
    console.log(`🔕 Cooldown: ${config.tracking.notificationCooldownMinutes} minutes`);
    console.log('');

    this.isRunning = true;

    // Initial poll
    this.poll();

    // Schedule regular polls
    this.pollInterval = setInterval(
      () => this.poll(),
      config.tracking.pollIntervalSeconds * 1000
    );

    console.log('✅ Monitor running. Press Ctrl+C to stop.\n');
  }

  /**
   * Stop the flight monitor
   */
  stop() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.isRunning = false;
    console.log('\n🛬 Flight Monitor Stopped');
  }
}

module.exports = FlightMonitor;
