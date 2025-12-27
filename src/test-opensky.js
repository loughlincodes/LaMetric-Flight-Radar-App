/**
 * Test OpenSky API directly
 * Run: node src/test-opensky.js
 */

const { execSync } = require('child_process');
const config = require('./config');

// Use curl.exe on Windows
const curlCmd = process.platform === 'win32' ? 'curl.exe' : 'curl';

console.log('🧪 Testing OpenSky API');
console.log('======================\n');
console.log(`Platform: ${process.platform}`);
console.log(`Using: ${curlCmd}`);
console.log(`Home: ${config.home.latitude}, ${config.home.longitude}`);
console.log(`Radius: ${config.tracking.radiusMiles} miles\n`);

// Calculate bounding box
const lat = config.home.latitude;
const lon = config.home.longitude;
const radiusMiles = config.tracking.radiusMiles;

const latDelta = radiusMiles / 69;
const lonDelta = radiusMiles / (69 * Math.cos(lat * Math.PI / 180));

const bbox = {
  lamin: lat - latDelta,
  lamax: lat + latDelta,
  lomin: lon - lonDelta,
  lomax: lon + lonDelta,
};

console.log('Bounding box:');
console.log(`  Lat: ${bbox.lamin.toFixed(4)} to ${bbox.lamax.toFixed(4)}`);
console.log(`  Lon: ${bbox.lomin.toFixed(4)} to ${bbox.lomax.toFixed(4)}\n`);

// Build URL
const url = `https://opensky-network.org/api/states/all?lamin=${bbox.lamin}&lamax=${bbox.lamax}&lomin=${bbox.lomin}&lomax=${bbox.lomax}`;

console.log('API URL:');
console.log(`  ${url}\n`);

console.log('📡 Making request...\n');

try {
  const cmd = `${curlCmd} -s -w "\\n\\nHTTP_CODE:%{http_code}" "${url}"`;
  const result = execSync(cmd, { timeout: 30000, encoding: 'utf8', shell: true });
  
  // Split response and HTTP code
  const parts = result.split('\n\nHTTP_CODE:');
  const body = parts[0];
  const httpCode = parts[1] ? parts[1].trim() : 'unknown';
  
  console.log(`HTTP Status: ${httpCode}`);
  console.log(`Response length: ${body.length} bytes\n`);
  
  if (httpCode === '200') {
    try {
      const data = JSON.parse(body);
      console.log(`✅ Success! Time: ${data.time}`);
      console.log(`   Aircraft in bounding box: ${data.states ? data.states.length : 0}`);
      
      if (data.states && data.states.length > 0) {
        console.log('\n   First 5 aircraft:');
        data.states.slice(0, 5).forEach((s, i) => {
          const callsign = (s[1] || '').trim() || s[0];
          const alt = s[7] ? Math.round(s[7] * 3.28084) : 'ground';
          console.log(`   ${i+1}. ${callsign} - ${alt} ft`);
        });
      }
    } catch (parseError) {
      console.log('❌ Failed to parse JSON:');
      console.log(`   ${body.substring(0, 200)}`);
    }
  } else if (httpCode === '429') {
    console.log('❌ Rate limited (429 Too Many Requests)');
    console.log('   Wait a few minutes and try again.');
    console.log(`   Response: ${body.substring(0, 100)}`);
  } else {
    console.log(`❌ Unexpected response:`);
    console.log(`   ${body.substring(0, 200)}`);
  }
} catch (error) {
  console.log('❌ Request failed:');
  console.log(`   ${error.message}`);
}

