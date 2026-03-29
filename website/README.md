# Marine Microplastics Map

An interactive hackathon project for exploring global marine microplastics sample data on a world map. Users can click anywhere on the map to inspect the nearest sample, view local context, and generate lightweight AI-assisted explanations, predictions, and response ideas based on nearby dataset rows.

## Overview

This project combines a browser-based map interface with a small Node server. The frontend renders the dataset visually and lets users interact with individual sample points. The backend reads the marine microplastics dataset, prepares nearby sample context, and forwards prompts to the Hugging Face chat completion API.

The result is a simple exploratory tool for answering questions such as:

- What is the nearest sampled location to this point?
- What concentration class is most common nearby?
- What does the local sample history suggest?
- What actions could be taken at this location?

## Features

- Interactive Leaflet world map with all marine microplastics sample points
- Click-to-select behavior for arbitrary map locations and dataset markers
- Nearest-sample panel with:
  - latitude and longitude
  - ocean
  - medium
  - measurement
  - concentration class
  - sample date
  - distance from the selected point
- Global concentration class breakdown chart
- Local pattern summary based on nearby samples
- AI-assisted prediction widget with 1, 5, and 10 year horizons
- AI-assisted question answering based on the selected point and surrounding rows
- AI-assisted action-step generation based on current local severity and nearby history
- Visual header and footer imagery, animated background, and sound effect support

## Data

The project uses the marine microplastics dataset stored locally in:

- [`data/Marine_Microplastics_WGS84_4325541212716015555.json`](/Users/vibamohan/coding/hackathon/mvhacks/website/data/Marine_Microplastics_WGS84_4325541212716015555.json)

The frontend normalizes the dataset into a simpler working format in:

- [`src/dataService.js`](/Users/vibamohan/coding/hackathon/mvhacks/website/src/dataService.js)

Displayed sample fields are focused on the final project needs:

- latitude
- longitude
- ocean
- medium
- measurement
- concentration class
- date

## Project Structure

- [`index.html`](/Users/vibamohan/coding/hackathon/mvhacks/website/index.html): main page structure
- [`styles.css`](/Users/vibamohan/coding/hackathon/mvhacks/website/styles.css): visual styling and layout
- [`src/app.js`](/Users/vibamohan/coding/hackathon/mvhacks/website/src/app.js): map setup, click handling, UI rendering, and frontend API calls
- [`src/dataService.js`](/Users/vibamohan/coding/hackathon/mvhacks/website/src/dataService.js): dataset loading, normalization, nearest-sample lookup, nearby sample lookup
- [`server.mjs`](/Users/vibamohan/coding/hackathon/mvhacks/website/server.mjs): local Node server and Hugging Face request handling

## How It Works

### Frontend flow

1. The app loads the marine microplastics dataset in the browser.
2. Leaflet renders every sample as a point on the world map.
3. When a user clicks the map or a dataset point:
   - the selected coordinates are updated
   - the nearest sample is found
   - nearby sample rows are collected
   - the side panel and summary widgets refresh
4. If the user asks a question, requests a prediction, or requests action steps, the browser sends the selected context to the Node server.

### Backend flow

1. The Node server reads the local dataset file.
2. It prepares relevant nearby rows and context for the selected point.
3. It sends that context to the Hugging Face chat completion endpoint.
4. It returns the generated response to the frontend.

## Running Locally

This project is meant to be run through the local Node server, not opened directly as a file.

### Requirements

- Node.js 18+ recommended
- A Hugging Face API token

### Start the app

```bash
cd /Users/vibamohan/coding/hackathon/mvhacks/website
export HUGGINGFACE_API_KEY="your_huggingface_token"
node server.mjs
```

Then open:

```text
http://localhost:8000
```

## Environment Variables

- `HUGGINGFACE_API_KEY`
  Required for chat, prediction, and action-step generation

- `HF_TOKEN`
  Optional alias for the same Hugging Face token

- `API_BASE_URL`
  Optional override for the Hugging Face API base URL

- `CHAT_MODEL`
  Optional override for the model string used by the server

## Notes and Limitations

- Predictions are qualitative estimates, not scientific forecasts
- The AI features depend on the selected point and nearby sample coverage
- Time coverage varies by location, so some areas have stronger historical context than others
- Model responses are only as good as the dataset context and API availability
- This repository reflects the final hackathon state; no further code changes were made after completion

## Demo Use

For the strongest demo flow:

1. Start the local server
2. Click a point on the map or click an existing dataset marker
3. Inspect the nearest sample panel
4. Review the local pattern summary
5. Generate a prediction
6. Ask a question about the area
7. Generate action steps for the selected location

## Credits

- Mapping: Leaflet
- Basemap tiles: OpenStreetMap
- Charts: Chart.js
- AI responses: Hugging Face chat completion API
- Dataset: marine microplastics sample data stored locally in this repository
