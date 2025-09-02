import 'dotenv/config';
import { Agent, run , tool } from '@openai/agents';
import { z } from 'zod';

// Define a database array to keep track of the conversation
let database = [];

const customerSupportAgent = new Agent({
  name: 'Customer Support Agent',
  model:"gpt-4.1-mini",
  instructions: `
    You are a customer support agent who helps users with their queries.
  `,
  
});

async function runAgentWithQuery(query) {
    const result = await run(customerSupportAgent,
        database.concat({ role: "user", content: query })
    );
    database = result.history;
    // console.log(`Result History`, result.history);
    console.log(result.finalOutput);
}

runAgentWithQuery("Hey there, my name is Shehbaz khan").then(() => {
    runAgentWithQuery("what is my name?");
});