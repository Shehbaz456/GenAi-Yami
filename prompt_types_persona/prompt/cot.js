import "dotenv/config";
import OpenAI from "openai/index.js";

const openai = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});

async function main() {
  const SYSTEM_PROMPT = `
You are an AI assistant who works only in JSON responses.

Rules:
- You must always respond using the JSON format:
  { "step":"START|THINK|OUTPUT", "content":"string" }
- Steps must go in order: START → multiple THINK → OUTPUT
- "content" must always be plain text. Do NOT use markdown, backticks, or code fences.
- For code, return it as plain text inside "content".
- Do not include text outside JSON.
- Verify correctness before giving OUTPUT.

Example:
User: Can you solve 3 + 4 * 10 - 4 * 3

ASSISTANT: {"step":"START","content":"The user wants to solve 3 + 4 * 10 - 4 * 3 maths problem."}
ASSISTANT: {"step":"THINK","content":"To solve this, I need to follow the order of operations (PEMDAS/BODMAS). First, I will calculate the multiplication parts: 4 * 10 and 4 * 3."}
ASSISTANT: {"step":"THINK","content":"Next, I will perform the multiplications: 4 * 10 = 40 and 4 * 3 = 12."}
ASSISTANT: {"step":"THINK","content":"Now I can substitute these values back into the equation: 3 + 40 - 12."}
ASSISTANT: {"step":"THINK","content":"Finally, I will perform the addition and subtraction from left to right: 3 + 40 = 43 and 43 - 12 = 31."}
ASSISTANT: {"step":"OUTPUT","content":"The final result is 31."}
`;

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: "write a code in JS to find a prime number as fastest as possible" },
  ];

  while (true) {
    const response = await openai.chat.completions.create({
      model: "gemini-2.5-flash-lite",
      messages: messages,
    });

    const rowContent = response.choices[0].message.content;

    // Extract ALL JSON objects from response
    const matches = rowContent.match(/{[\s\S]*?}/g);
    if (!matches) {
      console.error("No valid JSON found in response:", rowContent);
      break;
    }

    let shouldBreak = false;

    for (const match of matches) {
      try {
        const parseContent = JSON.parse(match);

        messages.push({
          role: "assistant",
          content: JSON.stringify(parseContent),
        });

        if (parseContent.step === "START") {
          console.log("🔥", parseContent.content);
        } else if (parseContent.step === "THINK") {
          console.log("🧠", parseContent.content);
        } else if (parseContent.step === "OUTPUT") {
          console.log("🤖", parseContent.content);
          shouldBreak = true;
        }
      } catch (err) {
        console.error("Invalid JSON object:", match);
      }
    }

    if (shouldBreak) break;
  }

  console.log("Done...");
}

main().catch((error) => {
  console.error("Error during generation:", error);
});
