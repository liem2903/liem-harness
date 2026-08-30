import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';
import { MessageParam, Tool } from '@anthropic-ai/sdk/resources';
import { useTool } from './helper';
import * as readline from 'node:readline/promises';

import { stdin as input, stdout as output } from 'node:process';

const client = new Anthropic();
const messages: MessageParam[] = [];

const tools: Tool[] = [
    {
        name: "read",
        description: "Given the relative file path, check the file path exists and then read the contents of the file and extract its contents",
        input_schema: {
            type: "object",
            properties: {
                path: {
                    type: "string",
                    description: "Relative path of the file that it is trying to read"
                }
            },
            required: ["path"]
        }
    }, 
    {
        name: "glob",
        description: "Given a pattern with wild cards - search through every file in the project, starting from the project root and recursing into subdirectories, until you find a matching pattern.",
        input_schema: {
            type: "object",
            properties: {
                pattern: {
                    type: "string",
                    description: "Pattern that matches the file"
                }
            },
            required: ["pattern"]
        },
    }
]

let first_turn = true
const rl = readline.createInterface({ input, output });

while (true) {
    const content = await rl.question(first_turn ? "What do you want condensed-bot to do for you? " : "> ");

    if (!content.trim()) {
        console.log("You haven't provided a question - please try again");
        first_turn = false;
        continue;
    }

    if (content.trim() === "/exit") {
        console.log("Thank you for using condensed-bot. Please come back soon!");
        break;
    }

    messages.push({role: "user", content});
    await runTurn(messages);
};

async function runTurn(messages: MessageParam[]) {
    let attempts = 0;

    while (attempts < 20) {
        const prompt = await client.messages.create({
            model: "claude-opus-5",
            max_tokens: 1000,
            tools,
            tool_choice: {type: "auto", disable_parallel_tool_use: false},
            messages,
        });

        if (prompt.stop_reason === "max_tokens" || prompt.stop_reason === "refusal" || prompt.stop_reason === "model_context_window_exceeded") {console.log("ERROR DETECTED"); break};

        messages.push({role: prompt.role, content: prompt.content});
        console.log(prompt.content.find((b) => b.type === "text")?.text);

        // Should not push instantly.
        if (prompt.stop_reason === "end_turn") break;
        
        const tool_use = prompt.content.filter((block): block is Anthropic.ToolUseBlock => block.type === "tool_use");
        const tool_blocks: Anthropic.ToolResultBlockParam[] = await Promise.all(tool_use.map((tool) => useTool(tool)));

        messages.push({role: "user", content: tool_blocks});

        attempts += 1
    }

    if (first_turn) first_turn = false
} 

rl.close();

