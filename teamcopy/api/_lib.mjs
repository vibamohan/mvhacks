import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATASET_PATH = path.join(
  __dirname,
  "..",
  "data",
  "Marine_Microplastics_WGS84_4325541212716015555.json"
);

const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN;
const API_BASE_URL = process.env.API_BASE_URL || "https://router.huggingface.co/v1";
const CHAT_MODEL =
  process.env.CHAT_MODEL || "meta-llama/Llama-3.1-8B-Instruct:fastest";

let datasetCache;

export function sendJson(response, statusCode, payload) {
  response.status(statusCode).json(payload);
}

export function getProviderConfig() {
  return {
    apiBaseUrl: API_BASE_URL,
    apiKey: HUGGINGFACE_API_KEY,
    model: CHAT_MODEL,
    provider: "huggingface",
  };
}

export async function readJsonBody(request) {
  if (request.body && typeof request.body === "object") {
    return request.body;
  }

  if (typeof request.body === "string" && request.body.length > 0) {
    return JSON.parse(request.body);
  }

  const chunks = [];
  for await (const chunk of request) {
    chunks.push(typeof chunk === "string" ? chunk : chunk.toString("utf8"));
  }

  const rawBody = chunks.join("");
  return rawBody ? JSON.parse(rawBody) : {};
}

export async function loadDataset() {
  if (!datasetCache) {
    const raw = await readFile(DATASET_PATH, "utf8");
    const parsed = JSON.parse(raw);
    datasetCache = parsed.layers[0].features.map((feature) => feature.attributes);
  }

  return datasetCache;
}

export function summarizeRow(row) {
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

export function selectRelevantRows(question, nearestSample, nearbySamples, dataset) {
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

export function groupYears(rows) {
  const counts = new Map();
  for (const row of rows || []) {
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

export function findDominantSeverity(rows, nearestSample) {
  const counts = new Map();
  for (const row of rows || []) {
    const className = row.concentrationClassText || row.concentration || "Unknown";
    counts.set(className, (counts.get(className) || 0) + 1);
  }

  if (counts.size === 0) {
    return nearestSample?.concentrationClassText || "Unknown";
  }

  return [...counts.entries()].sort((left, right) => right[1] - left[1])[0][0];
}

export function summarizeHistory(rows) {
  const sortedRows = [...(rows || [])]
    .filter((row) => row && (row.rawDate || row.date))
    .sort((left, right) => {
      const leftDate = new Date(left.rawDate ?? left.date).getTime();
      const rightDate = new Date(right.rawDate ?? right.date).getTime();
      return leftDate - rightDate;
    });

  return sortedRows.map((row) => ({
    date: row.date,
    year: row.date ? new Date(row.date).getUTCFullYear() : null,
    concentration: row.concentrationClassText || row.concentration || "Unknown",
    measurement: row.measurementLabel || row.measurement || null,
    medium: row.medium || null,
    region: row.region || null,
    subRegion: row.subRegion || null,
    ocean: row.ocean || null,
  }));
}

export async function createModelCompletion(messages) {
  const { apiBaseUrl, apiKey, model, provider } = getProviderConfig();

  if (!apiKey) {
    const error = new Error("Set HUGGINGFACE_API_KEY or HF_TOKEN before starting the server.");
    error.statusCode = 500;
    error.provider = provider;
    throw error;
  }

  const modelResponse = await fetch(`${apiBaseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
    }),
  });

  const result = await modelResponse.json();

  if (!modelResponse.ok) {
    const providerMessage = result.error?.message || result.error || "Hugging Face request failed.";
    const error = new Error(
      providerMessage.includes("expected pattern")
        ? `${providerMessage} Try a CHAT_MODEL value like "meta-llama/Llama-3.1-8B-Instruct:fastest".`
        : providerMessage
    );
    error.statusCode = modelResponse.status;
    error.provider = provider;
    throw error;
  }

  return {
    answer: result.choices?.[0]?.message?.content || "No response",
    provider,
  };
}
