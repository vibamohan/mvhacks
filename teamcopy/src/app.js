import {
  fetchMicroplasticsLocations,
  fetchNearestMicroplasticsReport,
  fetchNearbyMicroplasticsReports,
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
const predictionSummary = document.querySelector("#predictionSummary");
const predictionBullets = document.querySelector("#predictionBullets");
const predictionForm = document.querySelector("#predictionForm");
const predictionHorizon = document.querySelector("#predictionHorizon");
const predictionSubmit = document.querySelector("#predictionSubmit");
const predictionStatus = document.querySelector("#predictionStatus");
const predictionAnswer = document.querySelector("#predictionAnswer");
const datasetCount = document.querySelector("#datasetCount");
const statusNote = document.querySelector("#statusNote");
const statsChartCanvas = document.querySelector("#statsChart");
const chatForm = document.querySelector("#chatForm");
const chatInput = document.querySelector("#chatInput");
const chatSubmit = document.querySelector("#chatSubmit");
const chatStatus = document.querySelector("#chatStatus");
const chatAnswer = document.querySelector("#chatAnswer");

const concentrationColors = {
  "Very Low": "#5bc0eb",
  Low: "#80ed99",
  Medium: "#ffd166",
  High: "#f77f00",
  "Very High": "#d62828",
};

let selectedContext = null;
let statsChart = null;

function getMarkerColor(classText) {
  return concentrationColors[classText] || "#9fc0d4";
}

function setSelectedCoordinates(latitude, longitude) {
  latitudeValue.textContent = formatCoordinate(latitude, "lat");
  longitudeValue.textContent = formatCoordinate(longitude, "lon");
}

function resetReport() {
  reportTitle.textContent = "Click the map to inspect a sample";
  regionValue.textContent = "--";
  subRegionValue.textContent = "--";
  oceanValue.textContent = "--";
  mediumValue.textContent = "--";
  measurementValue.textContent = "--";
  classTextValue.textContent = "--";
  dateValue.textContent = "--";
  distanceValue.textContent = "--";
}

function resetPredictions() {
  predictionSummary.textContent =
    "Click the map to estimate what nearby samples suggest about concentration patterns.";
  predictionBullets.innerHTML = "<li>Nearby rows will be summarized here.</li>";
  predictionStatus.textContent =
    "Predictions use nearby samples and let the model estimate a plausible future scenario.";
  predictionAnswer.textContent = "Choose a point on the map, then generate a prediction.";
}

function renderReport(report) {
  if (!report) {
    resetReport();
    reportTitle.textContent = "No nearby sample found";
    return;
  }

  reportTitle.textContent = `Sample ${report.id}`;
  regionValue.textContent = report.region;
  subRegionValue.textContent = report.subRegion;
  oceanValue.textContent = report.ocean;
  mediumValue.textContent = report.medium;
  measurementValue.textContent = `${report.measurementLabel} ${report.unit}`.trim();
  classTextValue.textContent = report.concentrationClassText;
  dateValue.textContent = report.dateLabel;
  distanceValue.textContent = `${report.distanceKm.toFixed(1)} km`;
}

function countBy(items, key) {
  return items.reduce((accumulator, item) => {
    const value = item[key] || "Unknown";
    accumulator[value] = (accumulator[value] || 0) + 1;
    return accumulator;
  }, {});
}

function findMostCommon(items, key) {
  const counts = countBy(items, key);
  return Object.entries(counts).sort((left, right) => right[1] - left[1])[0]?.[0] || "Unknown";
}

function averageMeasurement(items) {
  const numericValues = items
    .map((item) => item.measurement)
    .filter((value) => typeof value === "number" && Number.isFinite(value));

  if (numericValues.length === 0) {
    return null;
  }

  return numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length;
}

function renderConcentrationBreakdown(locations) {
  if (!statsChartCanvas || typeof Chart === "undefined") {
    return;
  }

  const classOrder = ["Very Low", "Low", "Medium", "High", "Very High"];
  const counts = classOrder.map(
    (className) => locations.filter((location) => location.concentrationClassText === className).length
  );

  if (statsChart) {
    statsChart.destroy();
  }

  statsChart = new Chart(statsChartCanvas, {
    type: "bar",
    data: {
      labels: classOrder,
      datasets: [
        {
          label: "Samples",
          data: counts,
          backgroundColor: classOrder.map((className) => getMarkerColor(className)),
          
          borderWidth: 0,
          borderRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
          ticks: {
            color: "#9fc0d4",
            font: {
              family: "IBM Plex Mono",
              size: 10,
            },
          },
        },
        y: {
          beginAtZero: true,
          grid: {
            color: "rgba(255,255,255,0.08)",
          },
          ticks: {
            precision: 0,
            color: "#9fc0d4",
            font: {
              family: "IBM Plex Mono",
              size: 10,
            },
          },
        },
      },
    },
  });
}

function renderPredictions(report, nearbyReports) {
  const average = averageMeasurement(nearbyReports);
  const dominantClass = findMostCommon(nearbyReports, "concentrationClassText");
  const dominantMedium = findMostCommon(nearbyReports, "medium");
  const dominantOcean = findMostCommon(nearbyReports, "ocean");
  const sameRegionCount = nearbyReports.filter((item) => item.region === report.region).length;

  predictionSummary.textContent =
    `The nearest ${nearbyReports.length} samples around this click are dominated by ${dominantClass.toLowerCase()} readings in ${dominantOcean}.`;

  const bullets = [
    `Average nearby measurement: ${average === null ? "Unavailable" : average.toFixed(2)} ${report.unit}`.trim(),
    `Most common sample medium nearby: ${dominantMedium}.`,
    `Samples in the same region as the nearest point: ${sameRegionCount} of ${nearbyReports.length}.`,
    `Nearest sample date: ${report.dateLabel}. Nearby dates may vary, so this is a local pattern, not a forecast.`,
  ];

  predictionBullets.innerHTML = "";
  bullets.forEach((text) => {
    const item = document.createElement("li");
    item.textContent = text;
    predictionBullets.appendChild(item);
  });
}

async function handleChatSubmit(event) {
  event.preventDefault();

  const question = chatInput.value.trim();
  if (!question) {
    chatStatus.textContent = "Enter a question first.";
    return;
  }

  if (!selectedContext) {
    chatStatus.textContent = "Click a point on the map first so the chatbot has local sample context.";
    return;
  }

  chatSubmit.disabled = true;
  chatStatus.textContent = "Asking the dataset...";
  chatAnswer.textContent = "Waiting for response...";

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question,
        selectedPoint: selectedContext.selectedPoint,
        nearestSample: selectedContext.nearestSample,
        nearbySamples: selectedContext.nearbySamples,
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      const provider = payload.provider || "chat provider";
      const errorText = payload.error || "Chat request failed";

      if (errorText.toLowerCase().includes("quota") || errorText.toLowerCase().includes("billing")) {
        throw new Error(
          `${provider} account has no available quota or billing for this API key.`
        );
      }

      if (errorText.toLowerCase().includes("invalid api key") || errorText.toLowerCase().includes("authentication")) {
        throw new Error(`${provider} API key is invalid.`);
      }

      if (errorText.toLowerCase().includes("set either openai_api_key or groq_api_key")) {
        throw new Error("Server is missing an API key. Start it with HUGGINGFACE_API_KEY or HF_TOKEN.");
      }

      if (errorText.toLowerCase().includes("set huggingface_api_key") || errorText.toLowerCase().includes("hf_token")) {
        throw new Error("Server is missing a Hugging Face API key. Start it with HUGGINGFACE_API_KEY or HF_TOKEN.");
      }

      throw new Error(errorText);
    }

    chatStatus.textContent = `Used ${payload.rowsUsed} nearby dataset rows through ${payload.provider || "the API"}.`;
    chatAnswer.textContent = payload.answer;
  } catch (error) {
    chatStatus.textContent = "Chat request failed.";
    chatAnswer.textContent = error.message;
  } finally {
    chatSubmit.disabled = false;
  }
}

async function handlePredictionSubmit(event) {
  event.preventDefault();

  if (!selectedContext) {
    predictionStatus.textContent = "Click a point on the map first so the prediction has local context.";
    return;
  }

  predictionSubmit.disabled = true;
  predictionStatus.textContent = "Generating a model-based estimate...";
  predictionAnswer.textContent = "Waiting for response...";

  try {
    const response = await fetch("/api/predict", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        years: Number(predictionHorizon.value),
        selectedPoint: selectedContext.selectedPoint,
        nearestSample: selectedContext.nearestSample,
        nearbySamples: selectedContext.nearbySamples,
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Prediction request failed");
    }

    predictionStatus.textContent = `Estimated using ${payload.rowsUsed} nearby dataset rows through ${payload.provider || "the API"}.`;
    predictionAnswer.textContent = payload.answer;
  } catch (error) {
    predictionStatus.textContent = "Prediction request failed.";
    predictionAnswer.textContent = error.message;
  } finally {
    predictionSubmit.disabled = false;
  }
}

async function initMap() {
  const locations = await fetchMicroplasticsLocations();
  const worldBounds = L.latLngBounds(L.latLng(-85, -180), L.latLng(85, 180));

  datasetCount.textContent = String(locations.length);
  renderConcentrationBreakdown(locations);

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
          `${location.measurementLabel} ${location.unit}<br>` +
          `${location.concentrationClassText}<br>` +
          `${location.dateLabel}`
      )
      .addTo(samplesLayer);
  });

  const clickMarker = L.circleMarker([0, 0], {
    radius: 7,
    color: "#07243b",
    weight: 2,
    fillColor: "#72e6ff",
    fillOpacity: 1,
  });

  resetReport();
  resetPredictions();

  map.on("click", async (event) => {
    const { lat, lng } = event.latlng;
    setSelectedCoordinates(lat, lng);
    resetReport();
    resetPredictions();
    clickMarker.setLatLng([lat, lng]).addTo(map);

    try {
      const [nearestReport, nearbyReports] = await Promise.all([
        fetchNearestMicroplasticsReport(lat, lng),
        fetchNearbyMicroplasticsReports(lat, lng, 25),
      ]);

      if (!nearestReport) {
        throw new Error("No nearest sample was found for this clicked point.");
      }

      renderReport(nearestReport);
      renderPredictions(nearestReport, nearbyReports);
      selectedContext = {
        selectedPoint: { latitude: lat, longitude: lng },
        nearestSample: nearestReport,
        nearbySamples: nearbyReports,
      };

      L.popup()
        .setLatLng([lat, lng])
        .setContent(
          `<strong>Clicked point</strong><br>${formatCoordinate(lat, "lat")}, ${formatCoordinate(lng, "lon")}<br><br>` +
            `<strong>Nearest sample</strong><br>Sample ${nearestReport.id}<br>${nearestReport.distanceKm.toFixed(1)} km away`
        )
        .openOn(map);

      chatStatus.textContent =
        "The chatbot will use the selected point, the nearest sample, and 25 nearby rows from the dataset.";
      chatAnswer.textContent = "Ask a question about why this area may show the pattern you see.";
      statusNote.textContent =
        "Map ready. Every dot is a microplastics sample from the dataset. Click anywhere to inspect the nearest one.";
    } catch (error) {
      resetReport();
      resetPredictions();
      reportTitle.textContent = "Nearest sample lookup failed";
      statusNote.textContent =
        "The clicked point could not be matched to a sample. Check the console and try another location.";
      console.error(error);
    }
  });

  chatForm.addEventListener("submit", handleChatSubmit);
  predictionForm.addEventListener("submit", handlePredictionSubmit);

  statusNote.textContent =
    "Map ready. Every dot is a microplastics sample from the dataset. Click anywhere to inspect the nearest one.";
}

initMap().catch((error) => {
  reportTitle.textContent = "Map failed to load";
  statusNote.textContent =
    "The interactive map could not start. Check the console and make sure the page is being served locally.";
  console.error(error);
});
