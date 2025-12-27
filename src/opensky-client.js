/**
 * OpenSky Network API Client
 *
 * Fetches real-time flight data for aircraft within a bounding box.
 * API docs: https://openskynetwork.github.io/opensky-api/
 */

const { execSync } = require('child_process');
const config = require('./config');

// Cache for aircraft metadata (type, registration, etc.)
const metadataCache = new Map();

// Rate limit state
let rateLimitedUntil = 0;

class OpenSkyClient {
  constructor() {
    this.baseUrl = config.opensky.baseUrl;
    this.username = config.opensky.username;
    this.password = config.opensky.password;
    this.hasAuth = !!(this.username && this.password);

    if (this.hasAuth) {
      console.log(`🔐 OpenSky: Authenticated as ${this.username}`);
    } else {
      console.log('🔓 OpenSky: Anonymous mode (limited to 400 credits/day)');
      console.log('   Tip: Register free at opensky-network.org for 10x more credits');
    }
  }

  /**
   * Check if we're currently rate limited
   */
  isRateLimited() {
    if (Date.now() < rateLimitedUntil) {
      const waitSecs = Math.ceil((rateLimitedUntil - Date.now()) / 1000);
      console.log(`⏳ Rate limited, waiting ${waitSecs}s...`);
      return true;
    }
    return false;
  }

  /**
   * Set rate limit backoff
   */
  setRateLimited(seconds = 60) {
    rateLimitedUntil = Date.now() + (seconds * 1000);
    console.log(`⚠️  Rate limited! Backing off for ${seconds} seconds.`);
  }

  /**
   * Execute a curl request (Windows + Unix compatible)
   */
  curlGet(url) {
    // Check rate limit first
    if (this.isRateLimited()) {
      return null;
    }

    // Use curl.exe on Windows to avoid PowerShell's Invoke-WebRequest alias
    const curlCmd = process.platform === 'win32' ? 'curl.exe' : 'curl';

    // Build command with optional authentication
    let cmd = `${curlCmd} -s -w "\\nHTTP_STATUS:%{http_code}"`;
    
    if (this.hasAuth) {
      cmd += ` -u "${this.username}:${this.password}"`;
    }
    
    cmd += ` "${url}"`;

    try {
      const result = execSync(cmd, { 
        timeout: 15000, 
        encoding: 'utf8',
        shell: true 
      });

      // Parse response and HTTP status
      const lines = result.trim().split('\n');
      const statusLine = lines.pop();
      const body = lines.join('\n');
      const httpStatus = statusLine.replace('HTTP_STATUS:', '');

      // Handle rate limiting
      if (httpStatus === '429') {
        this.setRateLimited(60); // Back off for 60 seconds
        return null;
      }

      // Handle other errors
      if (httpStatus !== '200') {
        console.error(`❌ OpenSky API error: HTTP ${httpStatus}`);
        return null;
      }

      return JSON.parse(body);
    } catch (error) {
      console.error('❌ OpenSky request failed:', error.message);
      return null;
    }
  }

  /**
   * Calculate bounding box around a point
   */
  calculateBoundingBox(lat, lon, radiusMiles) {
    const latDelta = radiusMiles / 69;
    const lonDelta = radiusMiles / (69 * Math.cos(lat * Math.PI / 180));

    return {
      lamin: lat - latDelta,
      lamax: lat + latDelta,
      lomin: lon - lonDelta,
      lomax: lon + lonDelta,
    };
  }

  /**
   * Get aircraft metadata (type, registration) from ICAO24
   * Note: Each call uses API credits!
   */
  async getAircraftMetadata(icao24) {
    // Check cache first
    if (metadataCache.has(icao24)) {
      return metadataCache.get(icao24);
    }

    try {
      // OpenSky metadata endpoint
      const url = `${this.baseUrl}/metadata/aircraft/icao/${icao24}`;
      const data = this.curlGet(url);

      if (data) {
        const metadata = {
          registration: data.registration || null,
          manufacturerName: data.manufacturerName || null,
          model: data.model || null,
          typecode: data.typecode || null,  // e.g., "A320", "B738"
          owner: data.owner || null,
        };
        metadataCache.set(icao24, metadata);
        return metadata;
      }
    } catch (error) {
      // Silently fail - metadata is optional
    }

    metadataCache.set(icao24, null);
    return null;
  }

  /**
   * Fetch aircraft states within a bounding box
   */
  async getStatesInBox(bbox) {
    const url = `${this.baseUrl}/states/all?lamin=${bbox.lamin}&lamax=${bbox.lamax}&lomin=${bbox.lomin}&lomax=${bbox.lomax}`;

    const data = this.curlGet(url);

    if (!data || !data.states || data.states.length === 0) {
      return [];
    }

    // Parse state vectors into readable objects
    return data.states.map(state => ({
      icao24: state[0],
      callsign: (state[1] || '').trim(),
      originCountry: state[2],
      timePosition: state[3],
      lastContact: state[4],
      longitude: state[5],
      latitude: state[6],
      baroAltitude: state[7],
      onGround: state[8],
      velocity: state[9],
      trueTrack: state[10],
      verticalRate: state[11],
      sensors: state[12],
      geoAltitude: state[13],
      squawk: state[14],
      spi: state[15],
      positionSource: state[16],
    }));
  }

  /**
   * Fetch aircraft near a location
   */
  async getAircraftNear(lat, lon, radiusMiles) {
    const bbox = this.calculateBoundingBox(lat, lon, radiusMiles);
    console.log(`🔍 Searching for aircraft within ${radiusMiles} miles`);

    const aircraft = await this.getStatesInBox(bbox);

    // Filter out aircraft on the ground
    const inFlight = aircraft.filter(a => !a.onGround && a.latitude && a.longitude);

    console.log(`   Found ${inFlight.length} aircraft in flight`);
    return inFlight;
  }

  /**
   * Enrich aircraft with metadata (type, etc.)
   * Only call this if FETCH_AIRCRAFT_METADATA=true
   */
  async enrichWithMetadata(aircraft) {
    const metadata = await this.getAircraftMetadata(aircraft.icao24);

    return {
      ...aircraft,
      typecode: metadata?.typecode || null,
      model: metadata?.model || null,
      registration: metadata?.registration || null,
    };
  }

  /**
   * Convert meters to feet
   */
  static metersToFeet(meters) {
    return meters ? Math.round(meters * 3.28084) : null;
  }

  /**
   * Convert m/s to knots
   */
  static msToKnots(ms) {
    return ms ? Math.round(ms * 1.94384) : null;
  }
}

module.exports = OpenSkyClient;
