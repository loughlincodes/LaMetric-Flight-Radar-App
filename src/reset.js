/**
 * Reset LaMetric - dismiss all notifications and return to clock
 *
 * Usage: npm run reset
 */

const LaMetricClient = require('./lametric-client');
const client = new LaMetricClient();
client.dismissNotifications();
