import {
  fetchMicroplasticsLocations,
  fetchNearestMicroplasticsReport,
  formatCoordinate,
} from "./dataService.js";

const mapElement = document.querySelector("#mapStage");
const latitudeValue = document.querySelector("#latitudeValue");
const longitudeValue = document.querySelector("#longitudeValue");
const reportTitle = document.querySelector("#reportTitle");
const regionValue = document.querySelector("#regionValue");
const subRegionValue = document.querySelector("#subRegionValue");
const oceanValue = document.querySelector("#oceanValue");
const mediumValue = document.querySelector("#mediumValue");
const measurementValue = document.querySelector("#measurementValue");
const classTextValue = document.querySelector("#classTextValue");
const dateValue = document.querySelector("#dateValue");
const distanceValue = document.querySelector("#distanceValue");
const datasetCount = document.querySelector("#datasetCount");
const statusNote = document.querySelector("#statusNote");

const concentrationColors = {
  "Very Low": "#5bc0eb",
  Low: "#80ed99",
  Medium: "#ffd166",
  High: "#f77f00",
  "Very High": "#d62828",
};

function getMarkerColor(classText) {
  return concentrationColors[classText] || "#9fc0d4";
}

function setSelectedCoordinates(latitude, longitude) {
  latitudeValue.textContent = formatCoordinate(latitude, "lat");
  longitudeValue.textContent = formatCoordinate(longitude, "lon");
}

function setLoadingState() {
  reportTitle.textContent = "Finding nearest sample...";
  regionValue.textContent = "--";
  subRegionValue.textContent = "--";
  oceanValue.textContent = "--";
  mediumValue.textContent = "--";
  measurementValue.textContent = "--";
  classTextValue.textContent = "--";
  dateValue.textContent = "--";
  distanceValue.textContent = "--";
}

function renderReport(report) {
  reportTitle.textContent = `Sample ${report.id}`;
  regionValue.textContent = report.region;
  subRegionValue.textContent = report.subRegion;
  oceanValue.textContent = report.ocean;
  mediumValue.textContent = report.medium;
  measurementValue.textContent = `${report.measurement} ${report.unit}`.trim();
  classTextValue.textContent = report.concentrationClassText;
  dateValue.textContent = report.dateLabel;
  distanceValue.textContent = `${report.distanceKm.toFixed(1)} km`;
}

async function initMap() {
  const locations = await fetchMicroplasticsLocations();

  renderGlobalStats(locations);
  datasetCount.textContent = String(locations.length);
  const worldBounds = L.latLngBounds(L.latLng(-85, -180), L.latLng(85, 180));

  datasetCount.textContent = String(locations.length);


  const map = L.map(mapElement, {
    preferCanvas: true,
    worldCopyJump: false,
    minZoom: 2,
    maxZoom: 8,
    maxBounds: worldBounds,
    maxBoundsViscosity: 1.0,
  }).setView([18, -30], 2);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
    noWrap: true,
  }).addTo(map);

  const samplesLayer = L.layerGroup().addTo(map);

  locations.forEach((location) => {
    L.circleMarker([location.latitude, location.longitude], {
      radius: 4,
      color: "#ffffff",
      weight: 0.8,
      fillColor: getMarkerColor(location.concentrationClassText),
      fillOpacity: 0.82,
    })
      .bindPopup(
        `<strong>Sample ${location.id}</strong><br>` +
          `${formatCoordinate(location.latitude, "lat")}, ${formatCoordinate(location.longitude, "lon")}<br>` +
          `${location.region} / ${location.subRegion}<br>` +
          `${location.ocean}<br>` +
          `${location.medium}<br>` +
          `${location.measurement} ${location.unit}<br>` +
          `${location.concentrationClassText}<br>` +
          `${location.dateLabel}`
      )
      .addTo(samplesLayer);
  });


function renderGlobalStats(locations) {
  const ctx = document.getElementById('statsChart').getContext('2d');
  
  // Count occurrences of each class
  const stats = {
    "Very Low": 0, "Low": 0, "Medium": 0, "High": 0, "Very High": 0
  };

  locations.forEach(loc => {
    if (stats.hasOwnProperty(loc.concentrationClassText)) {
      stats[loc.concentrationClassText]++;
    }
  });

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: Object.keys(stats),
      datasets: [{
        data: Object.values(stats),
        backgroundColor: ["#5bc0eb", "#80ed99", "#ffd166", "#f77f00", "#d62828"],
        borderRadius: 4
      }]
    },
    options: {
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { 
          beginAtZero: true, 
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: { color: '#9fc0d4', font: { family: 'IBM Plex Mono', size: 10 } }
        },
        x: { 
          grid: { display: false },
          ticks: { color: '#9fc0d4', font: { family: 'IBM Plex Mono', size: 9 } }
        }
      }
    }
  });
}
  const clickMarker = L.circleMarker([0, 0], {
    radius: 7,
    color: "#07243b",
    weight: 2,
    fillColor: "#72e6ff",
    fillOpacity: 1,
  });

  map.on("click", async (event) => {
    const { lat, lng } = event.latlng;
    setSelectedCoordinates(lat, lng);
    setLoadingState();
    clickMarker.setLatLng([lat, lng]).addTo(map);

    try {
      const report = await fetchNearestMicroplasticsReport(lat, lng);
      renderReport(report);

      L.popup()
        .setLatLng([lat, lng])
        .setContent(
          `<strong>Clicked point</strong><br>${formatCoordinate(lat, "lat")}, ${formatCoordinate(lng, "lon")}<br><br>` +
            `<strong>Nearest sample</strong><br>Sample ${report.id}<br>${report.distanceKm.toFixed(1)} km away`
        )
        .openOn(map);

      statusNote.textContent =
        "Map ready. Every dot is a microplastics sample from the marine dataset. Click anywhere to find the nearest one.";
    } catch (error) {
      reportTitle.textContent = "Lookup failed";
      regionValue.textContent = "--";
      subRegionValue.textContent = "--";
      oceanValue.textContent = "--";
      mediumValue.textContent = "--";
      measurementValue.textContent = "--";
      classTextValue.textContent = "--";
      dateValue.textContent = "--";
      distanceValue.textContent = "--";
      statusNote.textContent =
        "The marine microplastics dataset could not be loaded. Run this folder from a local web server and try again.";
      console.error(error);
    }
  });

  statusNote.textContent =
    "Map ready. Every dot is a microplastics sample from the marine dataset. Click anywhere to find the nearest one.";
}



initMap().catch((error) => {
  reportTitle.textContent = "Map failed to load";
  statusNote.textContent =
    "The interactive map could not start. Check the console and make sure the page is being served locally.";
  console.error(error);
});
