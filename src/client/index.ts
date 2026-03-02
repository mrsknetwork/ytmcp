import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "path";

async function runClient() {
    console.log("Starting YouTube MCP Client...");

    const serverPath = path.resolve(__dirname, "../../build/server/index.js");

    const transport = new StdioClientTransport({
        command: "node",
        args: [serverPath],
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

    console.log("\nTesting 'youtube_search_list' for 'Model Context Protocol'...");
    try {
        const result = await client.callTool({
            name: "youtube_search_list",
            arguments: {
                q: "Claude Skills",
                maxResults: 10
            }
        });

        console.log("Result:");
        // @ts-ignore
        console.log(result.content[0].text);
    } catch (err: any) {
        console.error("Error calling tool:", err.message);
    }

    console.log("\nClosing connection...");
    await client.close();
}

runClient().catch(console.error);
