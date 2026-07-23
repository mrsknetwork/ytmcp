import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ quiet: true });

async function runApiKeyToolsTestSuite() {
    console.log("Starting Full API-Key Level Tool Test Suite...\n");

    const serverPath = path.resolve("build/server/index.js");

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        console.error("ERROR: GOOGLE_API_KEY environment variable is missing in process.env or .env file.");
        process.exit(1);
    }

    const envVars = {
        PATH: process.env.PATH || "",
        HOME: process.env.HOME || "",
        GOOGLE_API_KEY: apiKey,
        ...(process.env.YT_DLP_USER_AGENT ? { YT_DLP_USER_AGENT: process.env.YT_DLP_USER_AGENT } : {}),
    };

    console.log("Launching MCP server process with GOOGLE_API_KEY via transport env option...");

    const transport = new StdioClientTransport({
        command: "node",
        args: [serverPath],
        env: envVars,
    });

    const client = new Client(
        {
            name: "ytmcp-api-key-test-client",
            version: "1.0.0",
        },
        {
            capabilities: {},
        }
    );

    try {
        await client.connect(transport);
        console.log("Connected to YouTube MCP server via StdioClientTransport.\n");

        let passed = 0;
        let failed = 0;

        async function testTool(name, description, args) {
            process.stdout.write(`Testing [${name}] (${description})... `);
            try {
                const res = await client.callTool({ name, arguments: args });
                if (res.isError) {
                    console.log("FAILED");
                    console.error(`  Error output: ${JSON.stringify(res.content)}`);
                    failed++;
                    return null;
                } else {
                    console.log("PASSED");
                    passed++;
                    return res;
                }
            } catch (err) {
                console.log("FAILED");
                console.error(`  Exception: ${err.message}`);
                failed++;
                return null;
            }
        }

        // 1. search_content
        await testTool("search_content", "Search videos, channels, and playlists", { search_query: "Quantum Computing", max_results: 1 });

        // 2. get_video_metadata
        await testTool("get_video_metadata", "Fetch video metadata and statistics", { video_ids: "dQw4w9WgXcQ" });

        // 3. list_trending_videos
        await testTool("list_trending_videos", "Fetch trending videos by region", { region_code: "US", max_results: 1 });

        // 4. list_video_categories
        await testTool("list_video_categories", "List video categories for region", { region_code: "US" });

        // 5. list_video_captions
        await testTool("list_video_captions", "List available caption tracks for a video", { video_id: "dQw4w9WgXcQ" });

        // 6. get_channel_metadata
        await testTool("get_channel_metadata", "Fetch channel details by handle", { handle: "@mkbhd" });

        // 7. list_channel_activities
        await testTool("list_channel_activities", "List recent activities for a channel", { channel_id: "UCuAXFkgsw1L7xaCfnd5JJOw", max_results: 1 });

        // 8. list_channel_sections
        await testTool("list_channel_sections", "List channel layout sections", { channel_id: "UCuAXFkgsw1L7xaCfnd5JJOw" });

        // 9. list_playlists & 10. list_playlist_items (dynamic)
        const playlistsRes = await testTool("list_playlists", "List playlists for a channel", { channel_id: "UCuAXFkgsw1L7xaCfnd5JJOw", max_results: 1 });
        let targetPlaylistId = "PL2v-_VKLdqlXqg8K59xGfG94kZ2Xw_k0E";
        if (playlistsRes && playlistsRes.structuredContent && Array.isArray(playlistsRes.structuredContent.items) && playlistsRes.structuredContent.items.length > 0) {
            targetPlaylistId = playlistsRes.structuredContent.items[0].id;
        }
        await testTool("list_playlist_items", "List items inside a valid playlist", { playlist_id: targetPlaylistId, max_results: 1 });

        // 11. list_video_comments & 12. list_comment_replies
        const commentsRes = await testTool("list_video_comments", "List comment threads on a video", { video_id: "dQw4w9WgXcQ", max_results: 1 });
        let sampleCommentId = null;
        if (commentsRes && commentsRes.content && commentsRes.content[0] && commentsRes.content[0].text) {
            try {
                const parsedComments = JSON.parse(commentsRes.content[0].text);
                if (parsedComments.items && parsedComments.items[0]) {
                    sampleCommentId = parsedComments.items[0].id;
                }
            } catch (e) { }
        }

        if (sampleCommentId) {
            await testTool("list_comment_replies", "List replies to a specific comment thread", { parent_comment_id: sampleCommentId, max_results: 1 });
        } else {
            await testTool("list_comment_replies", "List replies check", { comment_ids: "Ugx385N2v8539281" });
        }

        // 13. list_subscriptions (Handles API Key / OAuth response)
        process.stdout.write(`Testing [list_subscriptions] (List subscriptions - expected OAuth required response)... `);
        const subRes = await client.callTool({ name: "list_subscriptions", arguments: { channel_id: "UCBJycsmduvYEL83R_U4JriQ" } });
        if (subRes.isError && subRes.content[0].text.includes("subscriptionForbidden")) {
            console.log("PASSED (Handled YouTube OAuth requirement)");
            passed++;
        } else if (!subRes.isError) {
            console.log("PASSED");
            passed++;
        } else {
            console.log("FAILED");
            failed++;
        }

        // 14. list_supported_languages
        await testTool("list_supported_languages", "List languages supported by YouTube", { language_code: "en" });

        // 15. list_supported_regions
        await testTool("list_supported_regions", "List regions supported by YouTube", { language_code: "en" });

        const totalTools = passed + failed;
        console.log(`\n========================================`);
        console.log(`API Key Level Tool Test Summary:`);
        console.log(`  PASSED: ${passed}/${totalTools}`);
        console.log(`  FAILED: ${failed}/${totalTools}`);
        console.log(`========================================\n`);

        await client.close();

        if (failed > 0) {
            process.exit(1);
        }
    } catch (err) {
        console.error("Test client failure:", err);
        process.exit(1);
    }
}

runApiKeyToolsTestSuite();
