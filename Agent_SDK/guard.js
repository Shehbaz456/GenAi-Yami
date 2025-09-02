import "dotenv/config";
import { Agent, run, tool } from "@openai/agents";
import { z } from "zod";

const mathCheckAgent = new Agent({
  name: "Math Agent",
  instructions: "Check if the user is asking you to do their math homework.",
  outputType: z.object({
    isMathHomework: z
      .boolean()
      .describe("Set this to true if its a math homework"),
  }),
});

const checkMathInput = {
  name: "Math Input Guardrail",
  execute: async ({ input }) => {
    // Process This input.
    const result = await run(mathCheckAgent, input);
    console.log(`😭: User is asking ${input}`);
    return {
      tripwireTriggered: result.finalOutput.isMathHomework ? true : false,
    };
  },
};

const customerSupportAgent = new Agent({
  name: "Customer Support Agent",
  model: "gpt-5-nano",
  instructions: `
    You are a customer support agent who helps users with their queries.
  `,
  inputGuardrails: [checkMathInput],
});

async function runAgentWithQuery(query) {
  const result = await run(customerSupportAgent, query);
  console.log(result.finalOutput);
}

runAgentWithQuery("Hey there, calculate 3 * 4 + 4 - 7 and tell me the result.");
