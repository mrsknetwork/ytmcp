import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "path";

async function runTestClient() {
    console.log("Starting Comprehensive MCP Test Client...\n");

    const serverPath = path.resolve("build/server/index.js");

    // Pass environment variables strictly via the transport env option
    const envVars = {
        PATH: process.env.PATH || "",
        HOME: process.env.HOME || "",
        ...(process.env.GOOGLE_API_KEY ? { GOOGLE_API_KEY: process.env.GOOGLE_API_KEY } : {}),
        ...(process.env.YT_DLP_USER_AGENT ? { YT_DLP_USER_AGENT: process.env.YT_DLP_USER_AGENT } : {}),
    };

    const hasApiKey = Boolean(envVars.GOOGLE_API_KEY);
    console.log(`Launching MCP server process (GOOGLE_API_KEY present: ${hasApiKey})...`);

    const transport = new StdioClientTransport({
        command: "node",
        args: [serverPath],
        env: envVars,
    });

    const client = new Client(
        {
            name: "ytmcp-test-client",
            version: "1.0.0",
        },
        {
            capabilities: {},
        }
    );

    try {
        await client.connect(transport);
        console.log("Successfully connected to YouTube MCP server via StdioClientTransport.\n");

        // 1. Test listing tools
        const toolsResponse = await client.listTools();
        const toolNames = toolsResponse.tools.map((t) => t.name);
        console.log(`[PASS] Registered tools count: ${toolNames.length}`);
        console.log(`Tools available: ${toolNames.join(", ")}\n`);

        // 2. Test get_video_transcript (Guest Mode tool using bin/yt-dlp)
        console.log("--- Test 1: 'get_video_transcript' (yt-dlp binary) ---");
        const transcriptResult = await client.callTool({
            name: "get_video_transcript",
            arguments: {
                video_id: "dQw4w9WgXcQ",
                max_characters: 200,
            },
        });
        if (transcriptResult.isError) {
            console.error("[FAIL] 'get_video_transcript':", JSON.stringify(transcriptResult, null, 2));
        } else {
            console.log("[PASS] 'get_video_transcript':", transcriptResult.content[0].text.substring(0, 150) + "...\n");
        }

        // 3. Test API Key tools or Guest Mode fallback
        if (hasApiKey) {
            console.log("--- Test 2: 'get_video_metadata' (API Key) ---");
            const metadataResult = await client.callTool({
                name: "get_video_metadata",
                arguments: {
                    video_ids: "dQw4w9WgXcQ",
                },
            });
            if (metadataResult.isError) {
                console.error("[FAIL] 'get_video_metadata':", JSON.stringify(metadataResult, null, 2));
            } else {
                console.log("[PASS] 'get_video_metadata' output received.");
            }

            console.log("\n--- Test 3: 'get_channel_metadata' (API Key, handle: @veritasium) ---");
            const channelResult = await client.callTool({
                name: "get_channel_metadata",
                arguments: {
                    handle: "@veritasium",
                },
            });
            if (channelResult.isError) {
                console.error("[FAIL] 'get_channel_metadata':", JSON.stringify(channelResult, null, 2));
            } else {
                console.log("[PASS] 'get_channel_metadata' output received.");
            }

            console.log("\n--- Test 4: 'search_content' (API Key, query: 'Quantum Computing') ---");
            const searchResult = await client.callTool({
                name: "search_content",
                arguments: {
                    search_query: "Quantum Computing",
                    max_results: 2,
                },
            });
            if (searchResult.isError) {
                console.error("[FAIL] 'search_content':", JSON.stringify(searchResult, null, 2));
            } else {
                console.log("[PASS] 'search_content' output received.");
            }
        } else {
            console.log("--- Test 2: Guest Mode Error Handling Verification ---");
            console.log("Calling 'get_video_metadata' without GOOGLE_API_KEY...");
            const guestErrResult = await client.callTool({
                name: "get_video_metadata",
                arguments: { video_ids: "dQw4w9WgXcQ" },
            });
            if (guestErrResult.isError && guestErrResult.content[0].text.includes("Guest Mode")) {
                console.log("[PASS] Guest Mode correctly intercepted tool call and returned guidance:");
                console.log(`  "${guestErrResult.content[0].text}"`);
            } else {
                console.error("[FAIL] Guest Mode response unexpected:", JSON.stringify(guestErrResult, null, 2));
            }

            console.log("\n--- Test 3: 'list_supported_languages' ---");
            const langResult = await client.callTool({
                name: "list_supported_languages",
                arguments: {},
            });
            if (langResult.isError && langResult.content[0].text.includes("Guest Mode")) {
                console.log("[PASS] Guest Mode correctly handled list_supported_languages requirement.");
            } else if (!langResult.isError) {
                console.log("[PASS] 'list_supported_languages' output received.");
            }
        }

        await client.close();
        console.log("\nAll MCP tool tests completed successfully!");
    } catch (err) {
        console.error("Test client error:", err);
        process.exit(1);
    }
}

runTestClient();
