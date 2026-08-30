import { MessageParam, Tool, ToolResultBlockParam, ToolUseBlock } from "@anthropic-ai/sdk/resources";
import read from "../tools/read";
import { glob } from 'glob';
 
export async function useTool(tool_use: ToolUseBlock): Promise<ToolResultBlockParam> {
    if (tool_use.name === "read") {
            const { path } = tool_use.input as { path: string };
    
            try {
                const content: string = await read(path);

                return {type: "tool_result", tool_use_id: tool_use.id, content}
            } catch (err) {
                return {
                    type: "tool_result", tool_use_id: tool_use.id, content: "Error", is_error: true
                }
            }
    } else if (tool_use.name === "glob") {
        const { pattern } = tool_use.input as { pattern: string };
        const { root } = tool_use.input as { root: string };

        const paths = await glob(`${pattern}`, {ignore: 'node_modules/**'});
        console.log(pattern);

        if (paths.length === 0) {
            return {
                type: "tool_result", tool_use_id: tool_use.id, content: `File Pattern ${pattern} could not be found.`, is_error: true 
            }
        } else {    
            return {
                type: "tool_result", tool_use_id: tool_use.id, content: paths.join("\n")
            }
        }
    } else { 
        return {
            type: "tool_result", tool_use_id: tool_use.id, content: "Tool does not exist yet", is_error: true 
        }
    }
}