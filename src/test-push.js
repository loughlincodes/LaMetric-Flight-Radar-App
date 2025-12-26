/**
 * Send a notification to LaMetric
 *
 * Usage:
 *   npm run test-push                      # Default message
 *   npm run test-push -- "Your message"    # Custom message
 *   npm run test-push -- --flight-data     # Sample flight notification
 *   npm run test-push -- -f                # Sample flight notification (short)
 */

const LaMetricClient = require('./lametric-client');
const config = require('./config');

// Sample flight data for testing (matches what OpenSky actually provides)
const SAMPLE_FLIGHT = {
  callsign: 'EIN123',
  typecode: 'A320',
  altitude: 35000,
  distance: 2.4,
};

async function testPush() {
  const arg = process.argv[2];
  const isFlightData = arg === '--flight-data' || arg === '-f';

  console.log('🧪 Testing LaMetric Local Push');
  console.log('==============================\n');

  // Check config
  if (!config.lametric.apiKey) {
    console.log('❌ Error: No API key found in .env');
    console.log('   Set LAMETRIC_API_KEY');
    process.exit(1);
  }

  console.log('Configuration:');
  console.log(`  Device IP: ${config.lametric.deviceIp}`);
  console.log(`  API Key: ${config.lametric.apiKey.substring(0, 20)}...`);

  if (isFlightData) {
    console.log('\n📋 Sample Flight Data (matches OpenSky output):');
    console.log(`  Callsign: ${SAMPLE_FLIGHT.callsign}`);
    console.log(`  Aircraft: ${SAMPLE_FLIGHT.typecode}`);
    console.log(`  Altitude: ${SAMPLE_FLIGHT.altitude.toLocaleString()} ft`);
    console.log(`  Distance: ${SAMPLE_FLIGHT.distance} mi`);
  } else {
    const message = arg || 'Flight Tracker Ready!';
    console.log(`  Message: "${message}"`);
  }
  console.log('');

  const client = new LaMetricClient();

  // Test connection
  console.log('📡 Testing connection...');
  const connectionTest = client.testConnection();

  if (!connectionTest.success) {
    console.log('\n❌ Could not connect to LaMetric device.');
    process.exit(1);
  }

  // Push notification
  console.log('\n📤 Sending notification...');

  let result;
  if (isFlightData) {
    result = client.pushFlightNotification(SAMPLE_FLIGHT);
  } else {
    const message = arg || 'Flight Tracker Ready!';
    result = client.pushNotification({
      text: message,
      icon: 'i8879',
      sound: 'notification',
    });
  }

  if (result.success) {
    console.log('\n✅ SUCCESS! Check your LaMetric device!');
  } else {
    console.log('\n❌ FAILED to push notification.');
  }
}

testPush().catch(console.error);
