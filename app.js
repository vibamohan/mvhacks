/**
 * OCEAN POLLUTION TRACKER - CORE SCRIPT
 * Hackathon MVP: JavaScript + Leaflet.js
 */

// ==========================================
// 1. MAP INITIALIZATION
// ==========================================
// Initialize map centered on the Pacific Ocean [Latitude, Longitude]
const map = L.map('map').setView([20, -160], 3); 

// Load the visual "tiles" (the actual map image)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// ==========================================
// 2. LIVE PLASTIC COUNTER LOGIC
// ==========================================
const plasticPerSecond = 300; // Estimated kg of plastic entering oceans
let totalPlasticSinceLoad = 0;

function updateCounter() {
    // Increment the count every 100ms for a "live ticking" effect
    totalPlasticSinceLoad += (plasticPerSecond / 10); 
    
    const counterElement = document.getElementById('plastic-count');
    if (counterElement) {
        // .toLocaleString() adds commas for better readability (e.g., 1,000)
        counterElement.innerText = Math.floor(totalPlasticSinceLoad).toLocaleString() + " kg";
    }
}

// Update the counter every 100 milliseconds
setInterval(updateCounter, 100);

// ==========================================
// 3. EXTERNAL DATA LOADING (GeoJSON)
// ==========================================
// This fetches the pollution coordinates from your local JSON file
fetch('pollution-data.json')
    .then(response => {
        if (!response.ok) throw new Error("File 'pollution-data.json' not found!");
        return response.json();
    })
    .then(data => {
        // Add the JSON data to the Leaflet map as styling circles
        L.geoJSON(data, {
            pointToLayer: (feature, latlng) => {
                return L.circleMarker(latlng, {
                    radius: 10,
                    fillColor: "#e67e22", // Pollution Orange
                    color: "#d35400",     // Border color
                    weight: 1,
                    fillOpacity: 0.7
                });
            }
        }).addTo(map);
    })
    .catch(err => console.error("Data Load Error:", err));

// ==========================================
// 4. UI INTERACTIVE ELEMENTS (Optional/Demo)
// ==========================================
function changeText() {
    const paragraph = document.getElementById("demo");
    if (paragraph) {
        paragraph.innerHTML = "Project Status: Active Monitoring";
        paragraph.style.color = "#2ecc71"; // Change to green on success
    }
}

// Link the button in index.html to the function above
const myButton = document.querySelector("button");
if (myButton) {
    myButton.addEventListener("click", changeText);
}

// Log status to VS Code console
console.log("Ocean Tracker script is successfully loaded!");