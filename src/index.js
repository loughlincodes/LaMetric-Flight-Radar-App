/**
 * LaMetric Flight Tracker
 *
 * Monitors for aircraft flying overhead and sends notifications
 * to your LaMetric Time clock.
 *
 * Usage: npm start
 */

const FlightMonitor = require('./flight-monitor');

// Create and start the monitor
const monitor = new FlightMonitor();

// Handle graceful shutdown
process.on('SIGINT', () => {
  monitor.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  monitor.stop();
  process.exit(0);
});

// Start monitoring
monitor.start();
