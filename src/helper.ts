import { MessageParam, Tool, ToolResultBlockParam, ToolUseBlock } from "@anthropic-ai/sdk/resources";
import read from "../tools/read";
import { glob } from 'glob';
import { PathScurry } from 'path-scurry';
import fs from 'node:fs';
import path from 'node:path';

const GLOB_IGNORE = [
    '**/node_modules/**',
    '**/.git/**',
    '**/.cache/**',
    '**/.npm/**',
    '**/.npm-global/**',
    '**/__pycache__/**',
    '**/.venv/**',
    '**/dist/**',
    '**/build/**',
    '**/target/**',
    '/proc/**',
    '/sys/**',
    '/dev/**',
    '**/.cargo/**',
    '**/.rustup/**',
    '**/go/pkg/mod/**',
    '**/.gradle/**',
    '**/.m2/**',
    '**/.docker/**',
    '**/snap/**',
    '**/.local/share/Trash/**',
];

function findProjectRoot(startDir: string): string {
    let dir = startDir;
    while (!fs.existsSync(path.join(dir, 'package.json'))) {
        const parent = path.dirname(dir);
        if (parent === dir) throw new Error('package.json not found');
        dir = parent;
    }
    return dir;
}

const PROJECT_ROOT = findProjectRoot(import.meta.dirname);

// Shared across every glob() call so repeat/parallel searches in the same
// run reuse already-walked directories instead of re-reading them from disk.
// Pinned to PROJECT_ROOT (not process.cwd()) so results don't depend on the
// directory the process happened to be launched from.
const globScurry = new PathScurry(PROJECT_ROOT);

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
        const paths = await glob(`${pattern}`, {ignore: GLOB_IGNORE, cwd: PROJECT_ROOT, absolute: true, scurry: globScurry});

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