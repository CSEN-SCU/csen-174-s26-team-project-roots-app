/**
 * OpenAI Chat Completions API — text generation / dialogue.
 * Set OPENAI_API_KEY in the environment.
 * Docs: https://platform.openai.com/docs/api-reference/chat/create
 */
import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error("Set OPENAI_API_KEY to run this demo.");
  process.exit(1);
}

const client = new OpenAI({ apiKey });

/** Varied inputs: normal, multilingual, adversarial / edge-case. */
const prompts = [
  {
    name: "short reasoning",
    messages: [
      { role: "user", content: "In one sentence, why might caching HTTP responses reduce latency?" },
    ],
  },
  {
    name: "non-English",
    messages: [
      { role: "user", content: "Translate to English: 'Il fait un temps détestable.'" },
    ],
  },
  {
    name: "ambiguous instruction",
    messages: [
      {
        role: "user",
        content:
          "List three colors. Do not use the letter E in any word in your reply, including the color names.",
      },
    ],
  },
  {
    name: "long context stress (repeated)",
    messages: [
      {
        role: "user",
        content: `Summarize the following in at most 15 words. Text:\n${"The quick brown fox jumps over the lazy dog. ".repeat(80)}`,
      },
    ],
  },
];

const model = process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini";

for (const { name, messages } of prompts) {
  console.log("\n---", name, "---");
  const completion = await client.chat.completions.create({
    model,
    messages,
    max_tokens: 400,
    temperature: 0.4,
  });
  const text = completion.choices[0]?.message?.content ?? "";
  console.log(text.trim());
}
