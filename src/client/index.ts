import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "path";

async function runClient() {
    console.log("Starting YouTube MCP Client...");

    const serverPath = path.resolve(__dirname, "../../build/server/index.js");

    // Forward CLI arguments (e.g., API key) to the server process
    const serverArgs = [serverPath, ...process.argv.slice(2)];

    const transport = new StdioClientTransport({
        command: "node",
        args: serverArgs,
        env: process.env as Record<string, string>,
    });

    const client = new Client({
        name: "youtube-mcp-client",
        version: "1.0.0",
    }, {
        capabilities: {}
    });

    console.log("Connecting to the YouTube MCP Server...");
    await client.connect(transport);
    console.log("Connected!");

    const tools = await client.listTools();
    console.log("\nAvailable Tools from Server:");
    tools.tools.forEach(t => console.log(`- ${t.name}: ${t.description}`));

}

runClient().catch(console.error);
