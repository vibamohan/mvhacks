const DATASET_URL = "./data/trash-hotspots.json";

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;

  return 2 * earthRadiusKm * Math.asin(Math.sqrt(a));
}

export function formatCoordinate(value, axis) {
  const absolute = Math.abs(value).toFixed(2);
  if (axis === "lat") {
    return `${absolute}° ${value >= 0 ? "N" : "S"}`;
  }

  return `${absolute}° ${value >= 0 ? "E" : "W"}`;
}

export function projectCoordinatesToPercent(latitude, longitude) {
  return {
    xPercent: ((longitude + 180) / 360) * 100,
    yPercent: ((90 - latitude) / 180) * 100,
  };
}

export async function fetchTrashReport(latitude, longitude) {
  const locations = await fetchTrashLocations();
  const nearest = locations
    .map((location) => ({
      ...location,
      distanceKm: haversineDistanceKm(latitude, longitude, location.latitude, location.longitude),
    }))
    .sort((left, right) => left.distanceKm - right.distanceKm)[0];

  return nearest;
}

export async function fetchTrashLocations() {
  const response = await fetch(DATASET_URL);
  if (!response.ok) {
    throw new Error(`Unable to load dataset: ${response.status}`);
  }

  const payload = await response.json();
  return payload.locations;
}
