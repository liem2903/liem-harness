import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';
import { MessageParam, Tool } from '@anthropic-ai/sdk/resources';
import read from '../tools/read';

const client = new Anthropic();
const messages: MessageParam[] = [{role: "user", content: "Look through my files and extract the contents of my hello.txt file"}];

console.log("User:", messages[0].content);
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
    }
]

let attempts = 0;

while (attempts < 20) {
    const prompt = await client.messages.create({
        model: "claude-opus-5",
        max_tokens: 1000,
        tools,
        tool_choice: {type: "auto", disable_parallel_tool_use: true},
        messages,
    });

    messages.push({role: prompt.role, content: prompt.content});
    console.log(prompt.content.find((b) => b.type === "text")?.text);

    if (prompt.stop_reason != "tool_use") break;

    const tool_use = prompt.content.find((block): block is Anthropic.ToolUseBlock => block.type === "tool_use");

    if (!tool_use) break;

    if (tool_use.name === "read") {
        const { path } = tool_use.input as { path: string };

        try {
            const content: string = await read(path);

            messages.push({role: "user", content: [{
                type: "tool_result",
                tool_use_id: tool_use.id,
                content,
            }]});
        } catch (err) {
            messages.push({role: "user", content: [{type: "tool_result", tool_use_id: tool_use.id, content: "Error", is_error: true}]})
        }
    } else {
        messages.push({role: "user", content: [{type: "tool_result", tool_use_id: tool_use.id, content: "Tool does not exist yet", is_error: true}]})
    }

    attempts += 1
}

