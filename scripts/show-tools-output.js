import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ quiet: true });

async function showAllToolsOutput() {
    console.log("================================================================================");
    console.log("             YOUTUBE MCP SERVER - 15 TOOLS OUTPUT DEMO SUITE");
    console.log("================================================================================\n");

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

    const transport = new StdioClientTransport({
        command: "node",
        args: [serverPath],
        env: envVars,
    });

    const client = new Client(
        {
            name: "ytmcp-show-output-client",
            version: "1.0.0",
        },
        { capabilities: {} }
    );

    try {
        await client.connect(transport);
        console.log("Connected to YouTube MCP server via StdioClientTransport.\n");

        async function runAndDisplay(stepNum, name, description, args) {
            console.log(`\n================================================================================`);
            console.log(`TOOL ${stepNum}/15: [${name}]`);
            console.log(`Description: ${description}`);
            console.log(`Arguments:   ${JSON.stringify(args)}`);
            console.log(`--------------------------------------------------------------------------------`);

            try {
                const res = await client.callTool({ name, arguments: args });
                if (res.isError) {
                    console.log("[STATUS: ERROR RESPONSE]");
                    console.log(res.content?.[0]?.text || JSON.stringify(res, null, 2));
                } else {
                    console.log("[STATUS: SUCCESS]");
                    const textOutput = res.content?.[0]?.text;
                    if (textOutput) {
                        // Print snippet of large outputs to keep terminal readable
                        if (textOutput.length > 1500) {
                            console.log(textOutput.substring(0, 1500) + `\n\n... [Output truncated (${textOutput.length} chars total)]`);
                        } else {
                            console.log(textOutput);
                        }
                    } else {
                        console.log(JSON.stringify(res, null, 2));
                    }
                }
                return res;
            } catch (err) {
                console.log("[STATUS: EXCEPTION]");
                console.error(err.message);
                return null;
            }
        }

        // 1. search_content
        await runAndDisplay(1, "search_content", "Search videos, channels, and playlists", {
            search_query: "Quantum Computing",
            max_results: 1
        });

        // 2. get_video_metadata
        await runAndDisplay(2, "get_video_metadata", "Fetch video snippet, contentDetails, and statistics", {
            video_ids: "dQw4w9WgXcQ"
        });

        // 3. list_trending_videos
        await runAndDisplay(3, "list_trending_videos", "Fetch most popular trending videos in region", {
            region_code: "US",
            max_results: 1
        });

        // 4. list_video_categories
        await runAndDisplay(4, "list_video_categories", "List video category names and IDs for a region", {
            region_code: "US"
        });

        // 5. list_video_captions
        await runAndDisplay(5, "list_video_captions", "List available caption tracks for a video", {
            video_id: "dQw4w9WgXcQ"
        });

        // 6. get_channel_metadata
        await runAndDisplay(6, "get_channel_metadata", "Fetch channel statistics and upload playlist ID", {
            handle: "@mkbhd"
        });

        // 7. list_channel_activities
        await runAndDisplay(7, "list_channel_activities", "Fetch recent channel activity feed", {
            channel_id: "UCuAXFkgsw1L7xaCfnd5JJOw",
            max_results: 1
        });

        // 8. list_channel_sections
        await runAndDisplay(8, "list_channel_sections", "List homepage shelf sections for a channel", {
            channel_id: "UCuAXFkgsw1L7xaCfnd5JJOw"
        });

        // 9. list_playlists & 10. list_playlist_items (dynamic)
        const playlistsRes = await runAndDisplay(9, "list_playlists", "List playlists for a channel", {
            channel_id: "UCuAXFkgsw1L7xaCfnd5JJOw",
            max_results: 1
        });

        let targetPlaylistId = "PL2v-_VKLdqlXqg8K59xGfG94kZ2Xw_k0E";
        if (playlistsRes && playlistsRes.structuredContent && Array.isArray(playlistsRes.structuredContent.items) && playlistsRes.structuredContent.items.length > 0) {
            targetPlaylistId = playlistsRes.structuredContent.items[0].id;
        }

        await runAndDisplay(10, "list_playlist_items", "List video entries inside a playlist", {
            playlist_id: targetPlaylistId,
            max_results: 1
        });

        // 11. list_video_comments & 12. list_comment_replies
        const commentsRes = await runAndDisplay(11, "list_video_comments", "Fetch top-level comments on a video", {
            video_id: "dQw4w9WgXcQ",
            max_results: 1
        });

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
            await runAndDisplay(12, "list_comment_replies", "Fetch replies to a specific comment thread", {
                parent_comment_id: sampleCommentId,
                max_results: 1
            });
        } else {
            await runAndDisplay(12, "list_comment_replies", "Fetch replies to a specific comment thread", {
                comment_ids: "Ugx385N2v8539281"
            });
        }

        // 13. list_subscriptions
        await runAndDisplay(13, "list_subscriptions", "Check channel subscriptions (OAuth requirement handling)", {
            channel_id: "UCBJycsmduvYEL83R_U4JriQ"
        });

        // 14. list_supported_languages
        await runAndDisplay(14, "list_supported_languages", "List languages supported by YouTube", {
            language_code: "en"
        });

        // 15. list_supported_regions
        await runAndDisplay(15, "list_supported_regions", "List regions supported by YouTube", {
            language_code: "en"
        });

        console.log(`\n================================================================================`);
        console.log(`             DEMO COMPLETED: ALL 15 TOOLS DISPLAYED SUCCESSFULLY`);
        console.log(`================================================================================\n`);

        await client.close();
    } catch (err) {
        console.error("Display client exception:", err);
        process.exit(1);
    }
}

showAllToolsOutput();
