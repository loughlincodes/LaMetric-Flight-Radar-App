/**
 * Send a notification to LaMetric
 *
 * Usage:
 *   npm run test-push                    # Default message
 *   npm run test-push -- "Your message"  # Custom message
 */

const LaMetricClient = require('./lametric-client');
const config = require('./config');

async function testPush() {
  // Get custom message from command line args
  const customMessage = process.argv[2];
  const message = customMessage || 'Flight Tracker Ready!';

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
  console.log(`  Message: "${message}"`);
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
  const result = client.pushNotification({
    text: message,
    icon: 'i8879',
    sound: 'notification',
  });

  if (result.success) {
    console.log('\n✅ SUCCESS! Check your LaMetric device!');
  } else {
    console.log('\n❌ FAILED to push notification.');
  }
}

testPush().catch(console.error);
