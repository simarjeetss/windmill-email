/**
 * Thin wrapper around the Vertex AI REST generateContent endpoint.
 * Uses an Express API key (x-goog-api-key) so no ADC / service account is needed.
 *
 * Endpoint:
 *   POST https://{location}-aiplatform.googleapis.com/v1/projects/{project}/locations/{location}
 *        /publishers/google/models/{model}:generateContent
 */

interface VertexPart   { text: string }
interface VertexContent { role: "user" | "model"; parts: VertexPart[] }

interface VertexRequest {
  contents: VertexContent[];
  generationConfig?: Record<string, unknown>;
}

interface VertexResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
  error?: { message: string };
}

export async function vertexGenerateContent(prompt: string): Promise<string> {
  const apiKey   = process.env.VERTEX_API_KEY;
  const project  = process.env.VERTEX_PROJECT;
  const location = process.env.VERTEX_LOCATION ?? "us-central1";
  const model    = "gemini-2.5-flash";

  if (!apiKey || !project)
    throw new Error("AI is not configured. Add VERTEX_API_KEY and VERTEX_PROJECT to your environment.");

  const url =
    `https://${location}-aiplatform.googleapis.com/v1/projects/${project}` +
    `/locations/${location}/publishers/google/models/${model}:generateContent`;

  const body: VertexRequest = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: "text/plain" },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({ error: { message: res.statusText } }))) as VertexResponse;
    throw new Error(err.error?.message ?? `HTTP ${res.status}`);
  }

  const data = (await res.json()) as VertexResponse;
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  if (!text) throw new Error("Empty response from Vertex AI");
  return text.trim();
}
