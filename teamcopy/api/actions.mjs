import {
  createModelCompletion,
  findDominantSeverity,
  getProviderConfig,
  groupYears,
  readJsonBody,
  sendJson,
  summarizeHistory,
} from "./_lib.mjs";

export default async function handler(request, response) {
  if (request.method !== "POST") {
    sendJson(response, 405, { error: "Method not allowed.", provider: "huggingface" });
    return;
  }

  try {
    const payload = await readJsonBody(request);
    const { selectedPoint, nearestSample, nearbySamples } = payload;

    if (!nearestSample) {
      sendJson(response, 400, { error: "Nearest sample is required.", provider: "huggingface" });
      return;
    }

    const dominantSeverity = findDominantSeverity(nearbySamples, nearestSample);
    const yearlyCoverage = groupYears(nearbySamples || []);
    const historySummary = summarizeHistory(nearbySamples || []);
    const result = await createModelCompletion([
      {
        role: "system",
        content:
          "You suggest practical environmental response steps using current local status and historical nearby sample rows. Keep the answer actionable, concise, grounded in the provided evidence, and organized into exactly two sections only: 'What common people can do' and 'What larger efforts can do'. Try not to make it too generic and instead tailor it to the levels there.",
      },
      {
        role: "user",
        content: `Suggest practical response steps for the selected marine microplastics location.

Selected point:
${JSON.stringify(selectedPoint, null, 2)}

Nearest sample:
${JSON.stringify(nearestSample, null, 2)}

Nearby samples:
${JSON.stringify(nearbySamples, null, 2)}

Observed nearby year coverage:
${JSON.stringify(yearlyCoverage, null, 2)}

Historical nearby sample summary:
${JSON.stringify(historySummary, null, 2)}

Dominant nearby severity:
${dominantSeverity}

Write exactly two sections:
1. What common people can do
2. What larger efforts can do

Base the suggestions on both the current status and the nearby historical pattern. If the history is thin, say that briefly and still give sensible actions based on the current severity and local context. Mention whether the surrounding rows suggest a persistent issue, a mixed pattern, or limited evidence. Keep it realistic and useful for this location.`,
      },
    ]);

    sendJson(response, 200, {
      answer: result.answer,
      rowsUsed: nearbySamples?.length || 0,
      provider: result.provider,
    });
  } catch (error) {
    sendJson(response, error.statusCode || 500, {
      error: error.message || "Hugging Face request failed.",
      provider: error.provider || getProviderConfig().provider,
    });
  }
}
