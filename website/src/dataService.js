const DATASET_URL = "./data/Marine_Microplastics_WGS84_4325541212716015555.json";

let locationsPromise = null;

/**
 * Converts degrees to radians for spherical geometry
 */
function toRadians(value) {
  return (value * Math.PI) / 180;
}

/**
 * Calculates the distance between two points in Kilometers
 */
function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  // Using Math.pow instead of ** to avoid SyntaxErrors in older browsers
  const a =
    Math.pow(Math.sin(dLat / 2), 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.pow(Math.sin(dLon / 2), 2);

  return 2 * earthRadiusKm * Math.asin(Math.sqrt(a));
}

/**
 * Formats epoch timestamps into human-readable strings
 */
function formatDate(epochMs) {
  if (!epochMs) return "Unknown";

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(epochMs));
}

function formatMeasurementNumber(value) {
  if (value === null || value === undefined || value === "") {
    return "N/A";
  }

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return "N/A";
  }

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(numericValue);
}

function normalizeUnit(unit) {
  const unitMap = {
    "pieces/m3": "pieces/m^3",
    "pieces/10 mins": "pieces/10 min",
    "pieces kg-1 d.w.": "pieces/kg dry weight",
  };

  return unitMap[unit] || unit || "";
}

function formatMeasurementLabel(measurement, unit) {
  const formattedNumber = formatMeasurementNumber(measurement);
  const formattedUnit = normalizeUnit(unit);

  if (formattedNumber === "N/A") {
    return "N/A";
  }

  return `${formattedNumber} ${formattedUnit}`.trim();
}

/**
 * Cleans up raw API data into a standard object format
 */
function normalizeFeature(feature) {
  const attributes = feature.attributes || {};
  const geometry = feature.geometry || {};
  
  const rawMeasurement = attributes.Microplastics_measurement;
  const fallbackMeasurement = attributes.Standardized_Nurdle__Amount;

  // Handle nullish coalescing manually for better compatibility
  const measurement = (rawMeasurement !== null && rawMeasurement !== undefined)
    ? rawMeasurement
    : (fallbackMeasurement !== null && fallbackMeasurement !== undefined && fallbackMeasurement !== ""
      ? Number(fallbackMeasurement)
      : null);

  return {
    id: attributes.OBJECTID,
    latitude: attributes.Latitude__degree_ !== undefined ? attributes.Latitude__degree_ : geometry.y,
    longitude: attributes.Longitude_degree_ !== undefined ? attributes.Longitude_degree_ : geometry.x,
    ocean: attributes.Location_Oceans || "Unknown",
    region: attributes.Location_Regions || "Unknown",
    subRegion: attributes.Location_SubRegions || "Unknown",
    medium: attributes.Medium || "Unknown",
    measurement: measurement,
    measurementLabel: formatMeasurementLabel(measurement, attributes.Unit),
    unit: normalizeUnit(attributes.Unit || ""),
    concentrationClassText: attributes.Concentration_class_text || "Unknown",
    dateLabel: formatDate(attributes.Date_m_d_yyyy),
    rawDate: attributes.Date_m_d_yyyy || null,
    measurementSource: (rawMeasurement !== null && rawMeasurement !== undefined)
      ? "Microplastics_measurement"
      : "Standardized_Nurdle__Amount",
  };
}

/**
 * Formats coordinates for the UI (e.g., 12.34° N)
 */
export function formatCoordinate(value, axis) {
  if (value === undefined || value === null) return "--";
  const absolute = Math.abs(value).toFixed(2);
  if (axis === "lat") {
    return `${absolute}° ${value >= 0 ? "N" : "S"}`;
  }
  return `${absolute}° ${value >= 0 ? "E" : "W"}`;
}

/**
 * Fetches and caches the global microplastics dataset
 */
export async function fetchMicroplasticsLocations() {
  if (!locationsPromise) {
    locationsPromise = fetch(DATASET_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Unable to load dataset: ${response.status}`);
        }
        return response.json();
      })
      .then((payload) => {
        // Navigate the nested JSON structure safely
        const features = (payload.layers && payload.layers[0] && payload.layers[0].features) || [];
        return features.map(normalizeFeature);
      })
      .catch(err => {
        locationsPromise = null; // Reset cache so user can retry
        throw err;
      });
  }
  return locationsPromise;
}

/**
 * Finds the single closest report to a given lat/lng
 */
export async function fetchNearestMicroplasticsReport(latitude, longitude) {
  const locations = await fetchMicroplasticsLocations();
  if (!locations || locations.length === 0) return null;

  // Efficient O(n) search instead of sorting the whole array
  return locations.reduce((nearest, current) => {
    const distance = haversineDistanceKm(latitude, longitude, current.latitude, current.longitude);
    if (!nearest || distance < nearest.distanceKm) {
      return { ...current, distanceKm: distance };
    }
    return nearest;
  }, null);
}

/**
 * Finds a list of the X nearest reports
 */
export async function fetchNearbyMicroplasticsReports(latitude, longitude, count = 25) {
  const locations = await fetchMicroplasticsLocations();
  return locations
    .map((location) => ({
      ...location,
      distanceKm: haversineDistanceKm(latitude, longitude, location.latitude, location.longitude),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, count);
}
