/**
 * Distance Calculations
 * 
 * Haversine formula to calculate great-circle distance between two points.
 */

/**
 * Calculate distance between two coordinates using Haversine formula
 * 
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in miles
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 3959; // Earth's radius in miles (use 6371 for km)
  
  const toRad = (deg) => deg * Math.PI / 180;
  
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}

/**
 * Filter aircraft by distance from a point
 * 
 * @param {Array} aircraft - Array of aircraft objects with latitude/longitude
 * @param {number} homeLat - Home latitude
 * @param {number} homeLon - Home longitude
 * @param {number} radiusMiles - Maximum distance in miles
 * @returns {Array} Aircraft within the radius, with distance added
 */
function filterByDistance(aircraft, homeLat, homeLon, radiusMiles) {
  return aircraft
    .map(plane => ({
      ...plane,
      distanceMiles: haversineDistance(homeLat, homeLon, plane.latitude, plane.longitude),
    }))
    .filter(plane => plane.distanceMiles <= radiusMiles)
    .sort((a, b) => a.distanceMiles - b.distanceMiles); // Closest first
}

module.exports = {
  haversineDistance,
  filterByDistance,
};

