# Ocean Trash Locator

Static prototype for a click-to-coordinate ocean map.

## What it does

- Displays a clickable world map
- Converts the click position into latitude and longitude
- Queries a local JSON dataset for the nearest trash hotspot
- Renders the selected point and the matched dataset point on the map
- Shows the returned report in the side panel

## Run it locally

Because the app fetches JSON, serve the directory over HTTP instead of opening `index.html` directly.

```bash
cd /Users/vibamohan/coding/hackathon/mvhacks/vibacopy
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Swap JSON for an API

Replace `fetchTrashReport()` in [src/dataService.js](/Users/vibamohan/coding/hackathon/mvhacks/vibacopy/src/dataService.js) with an API request that accepts latitude and longitude and returns:

```json
{
  "name": "Location title",
  "zone": "Ocean region",
  "latitude": 0,
  "longitude": 0,
  "concentration": "High",
  "primaryDebris": "Microplastics",
  "summary": "Short description"
}
```
