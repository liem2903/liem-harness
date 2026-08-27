import fs from "node:fs/promises";

export default async function read(relativePath: string): Promise<string> {
    try {
        return await fs.readFile(relativePath, "utf-8");
    } catch (err) {
        throw new Error("File does not exist");
    }
}