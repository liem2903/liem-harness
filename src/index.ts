import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';
import { MessageParam, Tool } from '@anthropic-ai/sdk/resources';
import { useTool } from './helper';

const client = new Anthropic();
const messages: MessageParam[] = [{role: "user", content: "Look through my files and extract the contents of my hello.txt file"}];

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

let attempts = 0;

while (attempts < 20) {
    const prompt = await client.messages.create({
        model: "claude-opus-5",
        max_tokens: 1000,
        tools,
        tool_choice: {type: "auto", disable_parallel_tool_use: false},
        messages,
    });
    // Should not push instantly.
    console.log(prompt.content.find((b) => b.type === "text")?.text);
    messages.push({role: prompt.role, content: prompt.content});

    if (prompt.stop_reason != "tool_use") break;

    const tool_use = prompt.content.filter((block): block is Anthropic.ToolUseBlock => block.type === "tool_use");
    console.log(tool_use);

    const tool_blocks: Anthropic.ToolResultBlockParam[] = await Promise.all(tool_use.map((tool) => useTool(tool)));

    messages.push({role: "user", content: tool_blocks});

    attempts += 1
}

