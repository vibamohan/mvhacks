import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { createReadStream, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATASET_PATH = path.join(
  __dirname,
  "data",
  "Marine_Microplastics_WGS84_4325541212716015555.json"
);
const PORT = Number(process.env.PORT || 8000);
const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN;
const API_BASE_URL =
  process.env.API_BASE_URL || "https://router.huggingface.co/v1";
const CHAT_MODEL =
  process.env.CHAT_MODEL || "meta-llama/Llama-3.1-8B-Instruct:fastest";

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
};

let datasetCache;

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

async function loadDataset() {
  if (!datasetCache) {
    const raw = await readFile(DATASET_PATH, "utf8");
    const parsed = JSON.parse(raw);
    datasetCache = parsed.layers[0].features.map((feature) => feature.attributes);
  }

  return datasetCache;
}

function summarizeRow(row) {
  return {
    id: row.OBJECTID,
    ocean: row.Location_Oceans,
    region: row.Location_Regions,
    subRegion: row.Location_SubRegions,
    country: row.Country,
    state: row.State,
    medium: row.Medium,
    measurement: row.Microplastics_measurement ?? row.Standardized_Nurdle__Amount,
    unit: row.Unit,
    concentration: row.Concentration_class_text,
    date: row.Date_m_d_yyyy,
    reference: row.Short_Reference,
  };
}

function selectRelevantRows(question, nearestSample, nearbySamples, dataset) {
  const tokens = question
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter((token) => token.length > 2);

  const byId = new Map();

  for (const sample of nearbySamples || []) {
    byId.set(sample.id, sample);
  }

  if (nearestSample) {
    byId.set(nearestSample.id, nearestSample);
  }

  for (const row of dataset) {
    const haystack = [
      row.Location_Oceans,
      row.Location_Regions,
      row.Location_SubRegions,
      row.Country,
      row.State,
      row.Medium,
      row.Concentration_class_text,
      row.Short_Reference,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (tokens.some((token) => haystack.includes(token))) {
      byId.set(row.OBJECTID, summarizeRow(row));
    }

    if (byId.size >= 20) {
      break;
    }
  }

  return [...byId.values()].slice(0, 20);
}

function groupYears(rows) {
  const counts = new Map();
  for (const row of rows) {
    const sourceDate = row.rawDate ?? row.date;
    if (!sourceDate) continue;
    const year = new Date(sourceDate).getUTCFullYear();
    if (Number.isFinite(year)) {
      counts.set(year, (counts.get(year) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((left, right) => left[0] - right[0])
    .map(([year, count]) => ({ year, count }));
}

async function handleChat(request, response) {
  if (!HUGGINGFACE_API_KEY) {
    sendJson(response, 500, {
      error: "Set HUGGINGFACE_API_KEY or HF_TOKEN before starting the server.",
      provider: "huggingface",
    });
    return;
  }

  let body = "";
  for await (const chunk of request) {
    body += chunk;
  }

  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    sendJson(response, 400, { error: "Invalid JSON body.", provider: "huggingface" });
    return;
  }

  const { question, selectedPoint, nearestSample, nearbySamples } = payload;
  if (!question || typeof question !== "string") {
    sendJson(response, 400, { error: "Question is required.", provider: "huggingface" });
    return;
  }

  const dataset = await loadDataset();
  const relevantRows = selectRelevantRows(question, nearestSample, nearbySamples, dataset);

  try {
    const modelResponse = await fetch(`${API_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
      },
      body: JSON.stringify({
        model: CHAT_MODEL,
        messages: [
          {
            role: "system",
            content:
              "You explain marine microplastics patterns using only the provided dataset context. Be concise, call out uncertainty, and do not invent causes not supported by the data.",
          },
          {
            role: "user",
            content: `Question: ${question}

Selected point:
${JSON.stringify(selectedPoint, null, 2)}

Nearest sample:
${JSON.stringify(nearestSample, null, 2)}

Nearby samples:
${JSON.stringify(nearbySamples, null, 2)}

Additional relevant dataset rows:
${JSON.stringify(relevantRows, null, 2)}

Explain why the observed phenomenon may be occurring in this area, based only on the provided rows. Mention region, ocean, medium, concentration class, measurement, and date when useful.`,
          },
        ],
      }),
    });

    const result = await modelResponse.json();
    if (!modelResponse.ok) {
      const providerMessage = result.error?.message || result.error || "Hugging Face request failed.";
      sendJson(response, modelResponse.status, {
        error:
          providerMessage.includes("expected pattern")
            ? `${providerMessage} Try a CHAT_MODEL value like "meta-llama/Llama-3.1-8B-Instruct:fastest".`
            : providerMessage,
        provider: "huggingface",
      });
      return;
    }

    sendJson(response, 200, {
      answer: result.choices?.[0]?.message?.content || "No response",
      rowsUsed: relevantRows.length + (nearbySamples?.length || 0),
      provider: "huggingface",
    });
  } catch (error) {
    sendJson(response, 500, {
      error: error.message || "Hugging Face request failed.",
      provider: "huggingface",
    });
  }
}

async function handlePrediction(request, response) {
  if (!HUGGINGFACE_API_KEY) {
    sendJson(response, 500, {
      error: "Set HUGGINGFACE_API_KEY or HF_TOKEN before starting the server.",
      provider: "huggingface",
    });
    return;
  }

  let body = "";
  for await (const chunk of request) {
    body += chunk;
  }

  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    sendJson(response, 400, { error: "Invalid JSON body.", provider: "huggingface" });
    return;
  }

  const { years, selectedPoint, nearestSample, nearbySamples } = payload;
  const horizonYears = Number(years);
  if (![1, 5, 10].includes(horizonYears)) {
    sendJson(response, 400, { error: "Prediction horizon must be 1, 5, or 10 years.", provider: "huggingface" });
    return;
  }

  const yearlyCoverage = groupYears(nearbySamples || []);

  try {
    const modelResponse = await fetch(`${API_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
      },
      body: JSON.stringify({
        model: CHAT_MODEL,
        messages: [
          {
            role: "system",
            content:
              "You create cautious, plausible scenario estimates for marine microplastics. Use only the provided rows and clearly signal uncertainty. If time coverage is thin, say so and make a light qualitative estimate instead of a confident forecast.",
          },
          {
            role: "user",
            content: `Create a ${horizonYears}-year forward-looking estimate for the clicked marine microplastics location.

Selected point:
${JSON.stringify(selectedPoint, null, 2)}

Nearest sample:
${JSON.stringify(nearestSample, null, 2)}

Nearby samples:
${JSON.stringify(nearbySamples, null, 2)}

Observed nearby year coverage:
${JSON.stringify(yearlyCoverage, null, 2)}

Write a short prediction with:
1. one sentence describing the likely direction of concentration,
2. one sentence describing what signals in the nearby rows support that estimate,
3. one sentence that states uncertainty because this is an estimate, not a measured forecast.

You may infer gently from nearby rows and dates, but do not invent hard numeric trend claims unless the rows support them.`,
          },
        ],
      }),
    });

    const result = await modelResponse.json();
    if (!modelResponse.ok) {
      const providerMessage = result.error?.message || result.error || "Hugging Face request failed.";
      sendJson(response, modelResponse.status, {
        error:
          providerMessage.includes("expected pattern")
            ? `${providerMessage} Try a CHAT_MODEL value like "meta-llama/Llama-3.1-8B-Instruct:fastest".`
            : providerMessage,
        provider: "huggingface",
      });
      return;
    }

    sendJson(response, 200, {
      answer: result.choices?.[0]?.message?.content || "No response",
      rowsUsed: nearbySamples?.length || 0,
      provider: "huggingface",
    });
  } catch (error) {
    sendJson(response, 500, {
      error: error.message || "Hugging Face request failed.",
      provider: "huggingface",
    });
  }
}


function serveStatic(request, response) {
  const requestPath = request.url === "/" ? "/index.html" : request.url;
  const safePath = path.normalize(decodeURIComponent(requestPath)).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(__dirname, safePath);

  if (!filePath.startsWith(__dirname) || !existsSync(filePath)) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  const ext = path.extname(filePath);
  response.writeHead(200, {
    "Content-Type": mimeTypes[ext] || "application/octet-stream",
  });
  createReadStream(filePath).pipe(response);
}

createServer(async (request, response) => {
  try {
    if (request.method === "POST" && request.url === "/api/chat") {
      await handleChat(request, response);
      return;
    }

    if (request.method === "POST" && request.url === "/api/predict") {
      await handlePrediction(request, response);
      return;
    }

    if (request.method === "GET") {
      serveStatic(request, response);
      return;
    }

    response.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Method not allowed");
  } catch (error) {
    sendJson(response, 500, {
      error: error.message || "Server error.",
      provider: "huggingface",
    });
  }
}).listen(PORT, () => {
  console.log(`Marine microplastics app running at http://localhost:${PORT}`);
});
