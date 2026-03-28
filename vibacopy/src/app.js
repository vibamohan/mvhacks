import { fetchTrashLocations, fetchTrashReport, formatCoordinate } from "./dataService.js";

const mapElement = document.querySelector("#mapStage");
const latitudeValue = document.querySelector("#latitudeValue");
const longitudeValue = document.querySelector("#longitudeValue");
const reportTitle = document.querySelector("#reportTitle");
const reportSummary = document.querySelector("#reportSummary");
const zoneValue = document.querySelector("#zoneValue");
const densityValue = document.querySelector("#densityValue");
const debrisValue = document.querySelector("#debrisValue");
const distanceValue = document.querySelector("#distanceValue");
const animalsValue = document.querySelector("#animalsValue");
const plasticsList = document.querySelector("#plasticsList");
const sourceList = document.querySelector("#sourceList");
const datasetCount = document.querySelector("#datasetCount");
const statusNote = document.querySelector("#statusNote");

const sourceProfiles = {
  "Great Pacific Garbage Patch": [
    {
      label: "NOAA Marine Debris Program",
      url: "https://marinedebris.noaa.gov/",
    },
    {
      label: "The Ocean Cleanup research overview",
      url: "https://theoceancleanup.com/great-pacific-garbage-patch/",
    },
  ],
  "North Atlantic Drift Zone": [
    {
      label: "NOAA Marine Debris Program",
      url: "https://marinedebris.noaa.gov/",
    },
    {
      label: "UNEP plastics overview",
      url: "https://www.unep.org/interactives/beat-plastic-pollution/",
    },
  ],
  "Indian Ocean Plastic Belt": [
    {
      label: "UNEP plastics overview",
      url: "https://www.unep.org/interactives/beat-plastic-pollution/",
    },
    {
      label: "IUCN marine plastics issue brief",
      url: "https://www.iucn.org/resources/issues-brief/marine-plastic-pollution",
    },
  ],
  "South Pacific Debris Field": [
    {
      label: "NOAA Marine Debris Program",
      url: "https://marinedebris.noaa.gov/",
    },
    {
      label: "IUCN marine plastics issue brief",
      url: "https://www.iucn.org/resources/issues-brief/marine-plastic-pollution",
    },
  ],
  "South Atlantic Accumulation Zone": [
    {
      label: "UNEP plastics overview",
      url: "https://www.unep.org/interactives/beat-plastic-pollution/",
    },
    {
      label: "IUCN marine plastics issue brief",
      url: "https://www.iucn.org/resources/issues-brief/marine-plastic-pollution",
    },
  ],
  "Mediterranean Surface Load": [
    {
      label: "UNEP plastics overview",
      url: "https://www.unep.org/interactives/beat-plastic-pollution/",
    },
    {
      label: "NOAA Marine Debris Program",
      url: "https://marinedebris.noaa.gov/",
    },
  ],
};

const impactProfiles = {
  "Great Pacific Garbage Patch": {
    plastics: ["Bottle fragments", "Lost fishing nets", "Food wrappers"],
    animals: "Sea turtles, albatrosses, tuna, and seals can swallow or become trapped in drifting plastic.",
    plainSummary:
      "This is a large area where ocean currents keep pulling floating trash into the same region.",
  },
  "North Atlantic Drift Zone": {
    plastics: ["Packaging film", "Bottle caps", "Broken crates"],
    animals: "Seabirds, whales, and dolphins are exposed to floating fragments and abandoned gear.",
    plainSummary:
      "Currents in the Atlantic can keep plastic circling here instead of letting it spread out quickly.",
  },
  "Indian Ocean Plastic Belt": {
    plastics: ["Textile fibers", "Single-use bags", "Foam containers"],
    animals: "Whale sharks, turtles, reef fish, and seabirds can encounter plastic carried from coastlines.",
    plainSummary:
      "Heavy coastal runoff and seasonal currents make this region a repeated pathway for plastic waste.",
  },
  "South Pacific Debris Field": {
    plastics: ["Net fragments", "Foam pieces", "Hard plastic shards"],
    animals: "Sea birds, turtles, and open-ocean fish can mistake plastic pieces for food.",
    plainSummary:
      "This zone is more spread out, but currents still concentrate debris in the wider South Pacific.",
  },
  "South Atlantic Accumulation Zone": {
    plastics: ["Marine rope", "Container fragments", "Plastic pellets"],
    animals: "Turtles, sharks, and migratory birds can encounter floating debris over long travel routes.",
    plainSummary:
      "Plastic gathers here because the surrounding currents slowly recirculate debris back into the area.",
  },
  "Mediterranean Surface Load": {
    plastics: ["Drink bottles", "Food packaging", "Consumer plastic pellets"],
    animals: "Loggerhead turtles, seabirds, and dolphins are at risk in this busy and enclosed sea.",
    plainSummary:
      "Because this sea is enclosed and heavily used, plastic can build up faster than it leaves.",
  },
};

const zonePalette = [
  "#2a9d8f",
  "#457b9d",
  "#8ecae6",
  "#f4a261",
  "#e76f51",
  "#ffb703",
];

function setSelectedCoordinates(latitude, longitude) {
  latitudeValue.textContent = formatCoordinate(latitude, "lat");
  longitudeValue.textContent = formatCoordinate(longitude, "lon");
}

function setLoadingState() {
  reportTitle.textContent = "Finding the nearest hotspot...";
  reportSummary.textContent =
    "The app is comparing your clicked latitude and longitude against every saved trash hotspot.";
  zoneValue.textContent = "--";
  densityValue.textContent = "--";
  debrisValue.textContent = "--";
  distanceValue.textContent = "--";
  animalsValue.textContent = "--";
  plasticsList.innerHTML = "<li>Loading examples...</li>";
  sourceList.innerHTML = "<li>Loading source links...</li>";
}

function renderList(container, values, formatter) {
  container.innerHTML = "";
  values.forEach((value) => {
    const item = document.createElement("li");
    formatter(item, value);
    container.appendChild(item);
  });
}

function renderReport(report) {
  const profile = impactProfiles[report.name] ?? {
    plastics: report.primaryDebris.split(",").map((item) => item.trim()),
    animals: "Marine animals can eat plastic or get tangled in larger pieces.",
    plainSummary: report.summary,
  };
  const sources = sourceProfiles[report.name] ?? [];

  reportTitle.textContent = report.name;
  reportSummary.textContent = profile.plainSummary;
  zoneValue.textContent = report.zone;
  densityValue.textContent = report.concentration;
  debrisValue.textContent = report.primaryDebris;
  distanceValue.textContent = `${report.distanceKm.toFixed(0)} km`;
  animalsValue.textContent = profile.animals;

  renderList(plasticsList, profile.plastics, (item, plastic) => {
    item.textContent = plastic;
  });

  renderList(sourceList, sources, (item, source) => {
    const link = document.createElement("a");
    link.href = source.url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = source.label;
    item.appendChild(link);
  });

  if (sources.length === 0) {
    sourceList.innerHTML = "<li>No source links available for this hotspot yet.</li>";
  }
}

function buildZoneColorMap(locations) {
  const uniqueZones = [...new Set(locations.map((location) => location.zone))];
  return uniqueZones.reduce((map, zone, index) => {
    map[zone] = zonePalette[index % zonePalette.length];
    return map;
  }, {});
}

async function initMap() {
  const locations = await fetchTrashLocations();
  const zoneColors = buildZoneColorMap(locations);
  const worldBounds = L.latLngBounds(
    L.latLng(-85, -180),
    L.latLng(85, 180)
  );

  datasetCount.textContent = String(locations.length);

  const map = L.map(mapElement, {
    worldCopyJump: true,
    minZoom: 2,
    maxZoom: 8,
    maxBounds: worldBounds,
    maxBoundsViscosity: 1.0,
  }).setView([18, -30], 2);

  L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}", {
    attribution:
      "Tiles &copy; Esri",
  }).addTo(map);

  L.tileLayer("https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}", {
    attribution: "Labels &copy; Esri",
    pane: "overlayPane",
  }).addTo(map);

  const zonesLayer = L.layerGroup().addTo(map);
  const markersLayer = L.layerGroup().addTo(map);

  locations.forEach((location) => {
    const zoneColor = zoneColors[location.zone];

    L.circle([location.latitude, location.longitude], {
      radius: 900000,
      color: zoneColor,
      weight: 1.5,
      fillColor: zoneColor,
      fillOpacity: 0.12,
      opacity: 0.8,
    })
      .bindTooltip(`${location.zone} overlay`)
      .addTo(zonesLayer);

    L.circleMarker([location.latitude, location.longitude], {
      radius: 7,
      color: "#ffffff",
      weight: 1.5,
      fillColor: "#ff7b00",
      fillOpacity: 0.95,
    })
      .bindPopup(
        `<strong>${location.name}</strong><br>${location.zone}<br>${formatCoordinate(location.latitude, "lat")}, ${formatCoordinate(location.longitude, "lon")}`
      )
      .addTo(markersLayer);
  });

  const clickMarker = L.circleMarker([0, 0], {
    radius: 8,
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
      const report = await fetchTrashReport(lat, lng);
      renderReport(report);

      L.popup()
        .setLatLng([lat, lng])
        .setContent(
          `<strong>Clicked point</strong><br>${formatCoordinate(lat, "lat")}, ${formatCoordinate(lng, "lon")}<br><br><strong>Nearest hotspot</strong><br>${report.name}`
        )
        .openOn(map);

      statusNote.textContent =
        "Coordinates now come directly from the map click, and every hotspot is shown on the map.";
    } catch (error) {
      reportTitle.textContent = "Lookup failed";
      reportSummary.textContent =
        "The hotspot dataset could not be loaded. Run this folder from a local web server and try again.";
      zoneValue.textContent = "--";
      densityValue.textContent = "--";
      debrisValue.textContent = "--";
      distanceValue.textContent = "--";
      animalsValue.textContent = "--";
      plasticsList.innerHTML = "<li>Dataset unavailable.</li>";
      sourceList.innerHTML = "<li>Dataset unavailable.</li>";
      console.error(error);
    }
  });

  statusNote.textContent =
    "Map ready. Click anywhere to see the exact latitude and longitude and the nearest trash hotspot.";
}

initMap().catch((error) => {
  reportTitle.textContent = "Map failed to load";
  reportSummary.textContent =
    "The interactive map could not start. Check the console and make sure the page is being served locally.";
  console.error(error);
});
