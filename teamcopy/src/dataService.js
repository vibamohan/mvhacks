const DATASET_URL = "./data/Marine_Microplastics_WGS84_2855111269302250333.json";

let locationsPromise;

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

function formatDate(epochMs) {
  if (!epochMs) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(epochMs));
}

function parseNumericValue(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeFeature(feature) {
  const attributes = feature.attributes;
  const directMeasurement = parseNumericValue(attributes.Microplastics_measurement);
  const fallbackMeasurement = parseNumericValue(attributes.Standardized_Nurdle__Amount);
  const measurement = directMeasurement ?? fallbackMeasurement;

  return {
    id: attributes.OBJECTID,
    latitude: attributes.Latitude__degree_ ?? feature.geometry.y,
    longitude: attributes.Longitude_degree_ ?? feature.geometry.x,
    ocean: attributes.Location_Oceans || "Unknown",
    region: attributes.Location_Regions || "Unknown",
    subRegion: attributes.Location_SubRegions || "Unknown",
    medium: attributes.Medium || "Unknown",
    measurement,
    measurementLabel: measurement === null ? "Unavailable" : String(measurement),
    unit: attributes.Unit || "",
    concentrationClassText: attributes.Concentration_class_text || "Unknown",
    dateLabel: formatDate(attributes.Date_m_d_yyyy),
    rawDate: attributes.Date_m_d_yyyy ?? null,
    measurementSource:
      directMeasurement !== null ? "Microplastics_measurement" : "Standardized_Nurdle__Amount",
  };
}

export function formatCoordinate(value, axis) {
  const absolute = Math.abs(value).toFixed(2);
  if (axis === "lat") {
    return `${absolute}° ${value >= 0 ? "N" : "S"}`;
  }

  return `${absolute}° ${value >= 0 ? "E" : "W"}`;
}

export async function fetchMicroplasticsLocations() {
  if (!locationsPromise) {
    locationsPromise = fetch(DATASET_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Unable to load dataset: ${response.status}`);
        }

        return response.json();
      })
      .then((payload) => payload.layers[0].features.map(normalizeFeature));
  }

  return locationsPromise;
}

export async function fetchNearestMicroplasticsReport(latitude, longitude) {
  const locations = await fetchMicroplasticsLocations();
  return locations
    .map((location) => ({
      ...location,
      distanceKm: haversineDistanceKm(latitude, longitude, location.latitude, location.longitude),
    }))
    .sort((left, right) => left.distanceKm - right.distanceKm)[0];
}

export async function fetchNearbyMicroplasticsReports(latitude, longitude, limit = 25) {
  const locations = await fetchMicroplasticsLocations();
  return locations
    .map((location) => ({
      ...location,
      distanceKm: haversineDistanceKm(latitude, longitude, location.latitude, location.longitude),
    }))
    .sort((left, right) => left.distanceKm - right.distanceKm)
    .slice(0, limit);
}
