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

    // Test: search_content (requires API Key or OAuth)
    console.log("\nTesting 'search_content' for 'Model Context Protocol'...");
    const searchResult = await client.callTool({
        name: "search_content",
        arguments: {
            search_query: "Model Context Protocol",
            max_results: 3
        }
    });
    // @ts-ignore
    console.log(searchResult.isError ? `Expected Error: ${searchResult.content[0].text}` : "Search OK");

    // Test: get_video_transcript (works in all modes - Guest, API Key, OAuth)
    console.log("\nTesting 'get_video_transcript' for 'dQw4w9WgXcQ'...");
    const transcriptResult = await client.callTool({
        name: "get_video_transcript",
        arguments: { video_id: "dQw4w9WgXcQ" }
    });
    // @ts-ignore
    const text = transcriptResult.content[0].text;
    console.log(transcriptResult.isError ? `Error: ${text}` : `Transcript OK (${text.length} chars)`);

    await client.close();
}

runClient().catch(console.error);
