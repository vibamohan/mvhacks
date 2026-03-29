import {
  createModelCompletion,
  getProviderConfig,
  groupYears,
  readJsonBody,
  sendJson,
} from "./_lib.mjs";

export default async function handler(request, response) {
  if (request.method !== "POST") {
    sendJson(response, 405, { error: "Method not allowed.", provider: "huggingface" });
    return;
  }

  try {
    const payload = await readJsonBody(request);
    const { years, selectedPoint, nearestSample, nearbySamples } = payload;
    const horizonYears = Number(years);

    if (![1, 5, 10].includes(horizonYears)) {
      sendJson(response, 400, {
        error: "Prediction horizon must be 1, 5, or 10 years.",
        provider: "huggingface",
      });
      return;
    }

    const yearlyCoverage = groupYears(nearbySamples || []);
    const result = await createModelCompletion([
      {
        role: "system",
        content:
          "You create cautious, plausible scenario estimates for marine microplastics. Use only the provided rows and previous knowledge about the ocean and pollution. clearly signal uncertainty. If time coverage is thin, say so and make a light qualitative estimate instead of a confident forecast.",
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
