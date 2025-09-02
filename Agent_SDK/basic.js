import 'dotenv/config';
import { Agent, run , tool } from '@openai/agents';
import { RECOMMENDED_PROMPT_PREFIX } from '@openai/agents-core/extensions';
import { z } from 'zod';

const getCurrentTime = tool({
    name:"get_current_time",
    description: 'this tool return current time',
    parameters:z.object({}),
    async execute(){
        return new Date().toString();
    }
})

const getMenuTool = tool({
  name: 'get_menu',
  description: 'Fetches and returns the menu items',
  parameters: z.object({}),
  async execute() {
    return {
      Drinks: {
        Chai: 'INR 50',
        Coffee: 'INR 70',
      },
      Veg: {
        DalMakhni: 'INR 250',
        Panner: 'INR 400',
      },
    };
  },
});

const CookingAgent = new Agent({
  name: 'Cooking Agent',
  model:"gpt-4.1-mini",
  tools: [getCurrentTime,getMenuTool],
  instructions:
    `You're a helpful cooking assistant who is specialized in cooking food.
    You help the users with food options and recipes and help them cook food.`
});


const CodingAgent = new Agent({
  name: 'Coding Agent',
  instructions: `
        You are an expert coding assistant particullarly in Javascript
    `,
  tools: [
    CookingAgent.asTool({
      toolName: "cooking_agent",
      toolDescription: "Helps with food options, recipes, and cooking guidance."
    })
  ]
});

const gatewayAgent = Agent.create({
  name: 'Triage Agent',
  instructions: `

  ${RECOMMENDED_PROMPT_PREFIX}

    You have list of handoffs which you need to use to handoff the current user query to the correct agent.
    You should hand off to Coding Agent if user asks about a coding question.
    You should hand off to Cooking Agent if question is realted to Cooking.
  `,
  handoffs: [CodingAgent, CookingAgent],
});

async function handleCookingQuery(query) {
    // const result = await  run(CookingAgent, query)
    const result = await run(gatewayAgent, query);
    console.log(`Result History`, result.history);
    console.log(`Hand Off To`, result.lastAgent.name);
    console.log(result.finalOutput);
}

handleCookingQuery("Depending on time, also what are the menu options i have?, how to cook pasta,"); 

