/**
 * Hugging Face Inference — text classification (sentiment), not generative chat.
 * Set HF_TOKEN (fine-grained token with "Make calls to Inference Providers").
 * Docs: https://huggingface.co/docs/api-inference/en/index
 */
import { InferenceClient } from "@huggingface/inference";

const token = process.env.HF_TOKEN ?? process.env.HUGGINGFACE_HUB_TOKEN;
if (!token) {
  console.error("Set HF_TOKEN (or HUGGINGFACE_HUB_TOKEN) to run this demo.");
  process.exit(1);
}

const client = new InferenceClient(token);

const model = "distilbert-base-uncased-finetuned-sst-2-english";

/** Push boundaries: clear positive/negative, mixed, sarcasm, empty-ish, very long. */
const inputs = [
  "This product exceeded my expectations.",
  "Terrible experience; I want a refund immediately.",
  "The movie was okay. Not great, not awful.",
  "Oh great, another meeting that could have been an email.",
  "   ",
  `${"The service was fine. ".repeat(200)}But the ending was disappointing.`,
];

for (const text of inputs) {
  console.log("\n--- input ---");
  console.log(text.length > 200 ? text.slice(0, 200) + "…" : text);
  try {
    const results = await client.textClassification({
      model,
      inputs: text,
    });
    console.log("scores:", results);
  } catch (err) {
    console.error("request failed:", err?.message ?? err);
  }
}
