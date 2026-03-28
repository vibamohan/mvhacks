/**
 * OCEAN POLLUTION TRACKER - SATELLITE CLICK PROTOTYPE
 * Standalone variant of app.js with map click handling that finds
 * the nearest satellite position to the clicked coordinate.
 */

// ==========================================
// 1. MAP INITIALIZATION
// ==========================================
const map = L.map('map').setView([20, -160], 3);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// ==========================================
// 2. DEMO SATELLITE DATA
// Replace this array with live satellite positions when available.
// ==========================================
const satellites = [
    { name: 'Pacific Watch 1', lat: 21.2, lon: -158.4 },
    { name: 'Pacific Watch 2', lat: 18.9, lon: -161.1 },
    { name: 'Pacific Watch 3', lat: 25.6, lon: -155.7 }
];

// Draw the demo satellites so the click behavior is visible on the map.

satellites.forEach((satellite) => {
    L.marker([satellite.lat, satellite.lon])
        .addTo(map)
        .bindPopup(
            `<b>${satellite.name}</b><br>Lat: ${satellite.lat.toFixed(4)}<br>Lon: ${satellite.lon.toFixed(4)}`
        );
});


// ==========================================
// 3. DISTANCE + LOOKUP HELPERS
// ==========================================
function distanceKm(lat1, lon1, lat2, lon2) {
    const earthRadiusKm = 6371;
    const toRadians = (degrees) => degrees * Math.PI / 180;

    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRadians(lat1)) *
            Math.cos(toRadians(lat2)) *
            Math.sin(dLon / 2) ** 2;

    return 2 * earthRadiusKm * Math.asin(Math.sqrt(a));
}

function findNearestSatellite(lat, lon) {
    let nearestSatellite = null;
    let nearestDistanceKm = Infinity;

    satellites.forEach((satellite) => {
        const currentDistanceKm = distanceKm(lat, lon, satellite.lat, satellite.lon);

        if (currentDistanceKm < nearestDistanceKm) {
            nearestSatellite = satellite;
            nearestDistanceKm = currentDistanceKm;
        }
    });

    return {
        ...nearestSatellite,
        distanceKm: nearestDistanceKm
    };
}

// ==========================================
// 4. MAP CLICK HANDLER
// ==========================================
map.on('click', (event) => {
    const { lat, lng } = event.latlng;
    const nearestSatellite = findNearestSatellite(lat, lng);

    L.popup()
        .setLatLng(event.latlng)
        .setContent(`
            <b>Clicked position</b><br>
            Lat: ${lat.toFixed(4)}<br>
            Lon: ${lng.toFixed(4)}<br><br>
            <b>Nearest satellite</b><br>
            ${nearestSatellite.name}<br>
            Satellite lat: ${nearestSatellite.lat.toFixed(4)}<br>
            Satellite lon: ${nearestSatellite.lon.toFixed(4)}<br>
            Distance: ${nearestSatellite.distanceKm.toFixed(2)} km
        `)
        .openOn(map);
});

console.log('Satellite click prototype loaded.');
