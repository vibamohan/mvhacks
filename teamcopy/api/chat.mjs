import {
  createModelCompletion,
  getProviderConfig,
  loadDataset,
  readJsonBody,
  selectRelevantRows,
  sendJson,
} from "./_lib.mjs";

export default async function handler(request, response) {
  if (request.method !== "POST") {
    sendJson(response, 405, { error: "Method not allowed.", provider: "huggingface" });
    return;
  }

  try {
    const payload = await readJsonBody(request);
    const { question, selectedPoint, nearestSample, nearbySamples } = payload;

    if (!question || typeof question !== "string") {
      sendJson(response, 400, { error: "Question is required.", provider: "huggingface" });
      return;
    }

    const dataset = await loadDataset();
    const relevantRows = selectRelevantRows(question, nearestSample, nearbySamples, dataset);
    const result = await createModelCompletion([
      {
        role: "system",
        content:
          "Explain marine microplastics using the given dataset. Use your previous knowledge about the area and causes of marine microplastics as well. Display the information in a clear and concise manner. Call out uncertainty, and do not invent causes not supported by the data. Make the information easy for the user to understand, don't over explain.",
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

Explain why the observed phenomenon may be occurring in this area, based only on the provided rows and your previous knowledge. Mention region, ocean, medium, concentration class, measurement, and date when useful. Make the information clear and concise, easy to understand. Do not overexplain.`,
      },
    ]);

    sendJson(response, 200, {
      answer: result.answer,
      rowsUsed: relevantRows.length + (nearbySamples?.length || 0),
      provider: result.provider,
    });
  } catch (error) {
    sendJson(response, error.statusCode || 500, {
      error: error.message || "Hugging Face request failed.",
      provider: error.provider || getProviderConfig().provider,
    });
  }
}
