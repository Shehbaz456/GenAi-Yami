import "dotenv/config";
import OpenAI from "openai/index.js";
import axios from "axios";

const openai = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});

async function getWeatherDetailsByCity(cityname = "") {
  const url = `https://wttr.in/${cityname.toLowerCase()}?format=%C+%t`;
  const { data } = await axios.get(url, { responseType: "text" });
  return `The current weather of ${cityname} is ${data}`;
}

async function getGithubUserInfoByUsername(username = '') {
  const url = `https://api.github.com/users/${username.toLowerCase()}`;
  const { data } = await axios.get(url);
  return JSON.stringify({
    login: data.login,
    id: data.id,
    name: data.name,
    bio: data.bio,
    location: data.location,
    twitter_username: data.twitter_username,
    public_repos: data.public_repos,
    public_gists: data.public_gists,
    user_view_type: data.user_view_type,
    followers: data.followers,
    following: data.following,
  });
}


const TOOL_MAP = {
  getWeatherDetailsByCity: getWeatherDetailsByCity,
  getGithubUserInfoByUsername: getGithubUserInfoByUsername,
};

async function main() {
  // These api calls are stateless (Chain Of Thought)
  const SYSTEM_PROMPT = `
    You are an AI assistant who works on START, THINK and OUTPUT format.
    For a given user query first think and breakdown the problem into sub problems.
    You should always keep thinking and thinking before giving the actual output.
    
    Also, before outputing the final result to user you must check once if everything is correct.
    You also have list of available tools that you can call based on user query.
    
    For every tool call, you must wait for the OBSERVATION (tool response). After receiving OBSERVE, you must always continue with at least one THINK step, and then finally give the OUTPUT step.

    Available Tools:
    - getWeatherDetailsByCity(cityname: string): Returns the current weather data of the city.
    - getGithubUserInfoByUsername(username: string): Returns the public info about the github user using github api

    Rules:
    - Strictly follow the output JSON format
    - Always follow the sequence: START → THINK → TOOL → OBSERVE → THINK → OUTPUT
    - Never stop at OBSERVE. After OBSERVE, always continue reasoning (THINK) 
      and then finish with OUTPUT.
    - Always perform only one step at a time and wait for other step.
    - Always make sure to do multiple steps of thinking before giving out output.
    - For every tool call always wait for the OBSERVE which contains the output from tool

  

    Output JSON Format:
    { "step": "START | THINK | OUTPUT | OBSERVE | TOOL" , "content": "string", "tool_name": "string", "input": "STRING" }

    Example:
    User: Hey, can you tell me weather of delhi?
    ASSISTANT: { "step": "START", "content": "The user is intertested in the current weather details about delhi" } 
    ASSISTANT: { "step": "THINK", "content": "Let me see if there is any available tool for this query" } 
    ASSISTANT: { "step": "THINK", "content": "I see that there is a tool available getWeatherDetailsByCity which returns current weather data" } 
    ASSISTANT: { "step": "THINK", "content": "I need to call getWeatherDetailsByCity for city delhi to get weather details" }
    ASSISTANT: { "step": "TOOL", "input": "delhi", "tool_name": "getWeatherDetailsByCity" }
    DEVELOPER: { "step": "OBSERVE", "content": "The weather of delhi is sunny with 32 Cel" }
    ASSISTANT: { "step": "THINK", "content": "Great, I got the weather details of Delhi" }
    ASSISTANT: { "step": "OUTPUT", "content": "The weather in Delhi is 32 C with clear sky. Please make sure to stay hydrated." }
  `;

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: "give some information about Shehbaz456 from github api and show data in tabular format" },
  ];


  let emptyResponseCount = 0;

  while (true) {  
    const response = await openai.chat.completions.create({
      model: "gemini-2.5-flash-lite",
      messages: messages,
    });

    // const rowContent = response.choices[0].message.content;
    const choice = response.choices?.[0];
    const rowContent =
      choice?.message?.content ||
      choice?.message?.[0]?.content ||
      choice?.delta?.content ||
      null;
    // console.log("Row Content:", rowContent);

    if (!rowContent) {
        emptyResponseCount++;
      console.warn(`⚠️ No content (attempt ${emptyResponseCount})`);

      if (emptyResponseCount >= 3) {
        console.error("❌ Model stalled after OBSERVE. Exiting loop.");
        break;
      }

      continue; 
    }
    emptyResponseCount = 0;

    // Extract ALL JSON objects from response
    const matches = rowContent.match(/{[\s\S]*?}/g);


    if (!matches || matches.length === 0) {
      console.error("⚠️ No valid JSON found in response:", rowContent);
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
        } else if (parseContent.step === "TOOL") {
          const toolCall = parseContent.tool_name;

          if (TOOL_MAP[toolCall]) {
            const toolResponse = await TOOL_MAP[toolCall](parseContent.input);

            // // ✅ Always print tool result so we see it
            // console.log("🛠️ Tool Response:", toolResponse);

            messages.push({
              role: "assistant",
              content: JSON.stringify({
                step: "OBSERVE",
                content: toolResponse,
              }),
            });
          } else {
            console.log("🛠️ Unknown tool:", toolCall);
            messages.push({
              role: "assistant",
              content: `There is no such tool available: ${toolCall}`,
            });
          }
        } else if (parseContent.step === "OBSERVE") {
          console.log("👀 Observation received:", parseContent.content);
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
