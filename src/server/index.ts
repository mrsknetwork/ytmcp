#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    ErrorCode,
    McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { google } from "googleapis";
import { authorize } from "./auth.js";
import dotenv from "dotenv";
import ytDlp from "yt-dlp-exec";


if (!process.env.GOOGLE_CLIENT_ID) {
    dotenv.config();
}

function isString(val: unknown): val is string {
    return typeof val === "string";
}

function parseNumber(val: unknown): number | undefined {
    if (typeof val === "number") return val;
    if (typeof val === "string" && !isNaN(Number(val))) return Number(val);
    return undefined;
}

let youtubeInstance: any = null;
let authPromise: Promise<any> | null = null;

async function getYoutubeClient() {
    if (youtubeInstance) return youtubeInstance;
    if (!authPromise) {
        authPromise = authorize()
            .then((authClient) => {
                console.error("Successfully authorized with Google.");
                youtubeInstance = google.youtube({
                    version: "v3",
                    auth: authClient,
                });
                return youtubeInstance;
            })
            .catch((err) => {
                authPromise = null;
                throw err;
            });
    }
    return authPromise;
}

async function runServer() {
    console.error("Starting YouTube MCP Server...");

    const server = new Server(
        {
            name: "@mrsknetwork/ytmcp",
            version: "1.0.0",
        },
        {
            capabilities: {
                tools: {},
            },
        }
    );

    server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
        await server.close();
        process.exit(0);
    });

    server.setRequestHandler(ListToolsRequestSchema, async () => {
        return {
            tools: [
                {
                    name: "search_youtube_content",
                    description: "Search for videos, channels, or playlists on YouTube.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            search_query: { type: "string", description: "Search query" },
                            max_results: { type: "number", description: "Default is 5. Max is 50." },
                            content_type: { type: "string", description: "Comma-separated list (e.g., 'video,channel,playlist')" },
                        },
                        required: ["search_query"],
                    },
                },
                {
                    name: "get_video_details",
                    description: "Get metadata for specific videos by ID, or get the most popular videos.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            video_ids: { type: "string", description: "Comma-separated video IDs" },
                            chart_type: { type: "string", description: "E.g., 'mostPopular'" },
                            category_id: { type: "string", description: "Used with chart_type='mostPopular'" },
                            max_results: { type: "number", description: "Default 5" },
                        },
                    },
                },
                {
                    name: "get_channel_details",
                    description: "Get channel information by ID or username.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            channel_ids: { type: "string", description: "Comma-separated channel IDs" },
                            username: { type: "string", description: "A YouTube username" },
                            max_results: { type: "number", description: "Default 5" },
                        },
                    },
                },
                {
                    name: "get_video_categories",
                    description: "Get standard video categories.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            region_code: { type: "string", description: "e.g., 'US', 'IN'" },
                        },
                        required: ["region_code"],
                    },
                },
                {
                    name: "get_supported_languages",
                    description: "Get supported languages on YouTube.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            language_code: { type: "string", description: "Language code for localized names" },
                        },
                    },
                },
                {
                    name: "get_supported_regions",
                    description: "Get supported regions on YouTube.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            language_code: { type: "string", description: "Language code for localized names" },
                        },
                    },
                },
                {
                    name: "get_playlists",
                    description: "Get user or channel playlists.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            playlist_ids: { type: "string", description: "Comma-separated playlist IDs" },
                            channel_id: { type: "string", description: "Channel ID to get playlists for" },
                            max_results: { type: "number", description: "Default 5" },
                        },
                    },
                },
                {
                    name: "get_playlist_items",
                    description: "Get items within a playlist.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            playlist_id: { type: "string", description: "The ID of the playlist" },
                            max_results: { type: "number", description: "Default 5" },
                        },
                        required: ["playlist_id"],
                    },
                },
                {
                    name: "get_comment_threads",
                    description: "Get top-level comment threads for a video or channel.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            video_id: { type: "string", description: "The video ID" },
                            channel_id: { type: "string", description: "The channel ID" },
                            search_terms: { type: "string", description: "Search query in comments" },
                            max_results: { type: "number", description: "Default 5" },
                        },
                    },
                },
                {
                    name: "get_comments_replies",
                    description: "Get specific comments by ID or parent ID (replies).",
                    inputSchema: {
                        type: "object",
                        properties: {
                            comment_ids: { type: "string", description: "Comma-separated comment IDs" },
                            parent_comment_id: { type: "string", description: "Parent comment ID to get replies" },
                            max_results: { type: "number", description: "Default 5" },
                        },
                    },
                },
                {
                    name: "get_video_captions_metadata",
                    description: "Get caption tracks metadata for a video.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            video_id: { type: "string", description: "The video ID" },
                        },
                        required: ["video_id"],
                    },
                },
                {
                    name: "download_video_caption",
                    description: "Download the transcript/caption text of a YouTube video using yt-dlp (bypasses API restrictions).",
                    inputSchema: {
                        type: "object",
                        properties: {
                            video_id: { type: "string", description: "The ID of the YouTube video to download the transcript for" },
                        },
                        required: ["video_id"],
                    },
                },

                {
                    name: "get_activities_list",
                    description: "Get a list of channel activities (e.g., uploads, likes).",
                    inputSchema: {
                        type: "object",
                        properties: {
                            channel_id: { type: "string", description: "Channel ID to fetch activities for" },
                            mine: { type: "boolean", description: "Set to true to fetch the authenticated user's activities" },
                            max_results: { type: "number", description: "Default 5" },
                        },
                    },
                },
                {
                    name: "get_channel_sections",
                    description: "Get the channel sections/shelves for a channel.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            channel_id: { type: "string", description: "Channel ID to fetch sections for" },
                            mine: { type: "boolean", description: "Set to true to fetch the authenticated user's sections" },
                        },
                    },
                },
                {
                    name: "get_members_list",
                    description: "Get members for the authenticated user's channel. (May require specific memberships scope & monetization enabled).",
                    inputSchema: {
                        type: "object",
                        properties: {
                            max_results: { type: "number", description: "Default 5" },
                        },
                    },
                },
                {
                    name: "get_memberships_levels",
                    description: "Get pricing levels for the authenticated user's channel. (May require specific memberships scope).",
                    inputSchema: {
                        type: "object",
                        properties: {},
                    },
                },
                {
                    name: "get_subscriptions_list",
                    description: "Get a list of subscriptions for a user or channel.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            channel_id: { type: "string", description: "Channel ID to fetch subscriptions for" },
                            mine: { type: "boolean", description: "Set to true to fetch the authenticated user's subscriptions" },
                            for_channel_id: { type: "string", description: "Comma-separated list of channel IDs to check if the user is subscribed to" },
                            max_results: { type: "number", description: "Default 5" },
                        },
                    },
                },
            ],
        };
    });

    // 5. Handle Tool Executions
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;

        // Default parts that are commonly required
        const commonPart = ["snippet", "id"];

        try {
            const youtube = await getYoutubeClient();

            switch (name) {
                case "search_youtube_content": {
                    if (!args || !isString(args.search_query)) {
                        throw new Error("Missing search query (search_query)");
                    }
                    const res = await youtube.search.list({
                        part: commonPart,
                        q: args.search_query,
                        maxResults: parseNumber(args.max_results) || 5,
                        type: isString(args.content_type) ? args.content_type.split(',') : undefined,
                    });
                    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
                }

                case "get_video_details": {
                    const params: any = {
                        part: ["snippet", "contentDetails", "statistics"],
                        maxResults: parseNumber(args?.max_results) || 5,
                    };
                    if (args?.video_ids && isString(args.video_ids)) params.id = args.video_ids.split(',');
                    if (args?.chart_type && isString(args.chart_type)) params.chart = args.chart_type;
                    if (args?.category_id && isString(args.category_id)) params.videoCategoryId = args.category_id;

                    if (!params.id && !params.chart) {
                        throw new Error("Must specify either video_ids or chart_type");
                    }
                    const res = await youtube.videos.list(params);
                    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
                }

                case "get_channel_details": {
                    const params: any = {
                        part: ["snippet", "statistics", "contentDetails"],
                        maxResults: parseNumber(args?.max_results) || 5,
                    };
                    if (args?.channel_ids && isString(args.channel_ids)) params.id = args.channel_ids.split(',');
                    if (args?.username && isString(args.username)) params.forUsername = args.username;

                    if (!params.id && !params.forUsername) {
                        throw new Error("Must specify either channel_ids or username");
                    }
                    const res = await youtube.channels.list(params);
                    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
                }

                case "get_video_categories": {
                    if (!args || !isString(args.region_code)) throw new Error("Missing region_code");
                    const res = await youtube.videoCategories.list({
                        part: ["snippet"],
                        regionCode: args.region_code,
                    });
                    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
                }

                case "get_supported_languages": {
                    const res = await youtube.i18nLanguages.list({
                        part: ["snippet"],
                        hl: isString(args?.language_code) ? args.language_code : undefined,
                    });
                    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
                }

                case "get_supported_regions": {
                    const res = await youtube.i18nRegions.list({
                        part: ["snippet"],
                        hl: isString(args?.language_code) ? args.language_code : undefined,
                    });
                    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
                }

                case "get_playlists": {
                    const params: any = {
                        part: ["snippet", "contentDetails"],
                        maxResults: parseNumber(args?.max_results) || 5,
                    };
                    if (args?.playlist_ids && isString(args.playlist_ids)) params.id = args.playlist_ids.split(',');
                    if (args?.channel_id && isString(args.channel_id)) params.channelId = args.channel_id;

                    if (!params.id && !params.channelId) {
                        throw new Error("Must specify either playlist_ids or channel_id");
                    }
                    const res = await youtube.playlists.list(params);
                    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
                }

                case "get_playlist_items": {
                    if (!args || !isString(args.playlist_id)) throw new Error("Missing playlist_id");
                    const res = await youtube.playlistItems.list({
                        part: ["snippet", "contentDetails"],
                        playlistId: args.playlist_id,
                        maxResults: parseNumber(args.max_results) || 5,
                    });
                    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
                }

                case "get_comment_threads": {
                    const params: any = {
                        part: ["snippet", "replies"],
                        maxResults: parseNumber(args?.max_results) || 5,
                    };
                    if (args?.video_id && isString(args.video_id)) params.videoId = args.video_id;
                    if (args?.channel_id && isString(args.channel_id)) params.channelId = args.channel_id;
                    if (args?.search_terms && isString(args.search_terms)) params.searchTerms = args.search_terms;

                    if (!params.videoId && !params.channelId) {
                        throw new Error("Must specify either video_id or channel_id");
                    }
                    const res = await youtube.commentThreads.list(params);
                    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
                }

                case "get_comments_replies": {
                    const params: any = {
                        part: ["snippet"],
                        maxResults: parseNumber(args?.max_results) || 5,
                    };
                    if (args?.comment_ids && isString(args.comment_ids)) params.id = args.comment_ids.split(',');
                    if (args?.parent_comment_id && isString(args.parent_comment_id)) params.parentId = args.parent_comment_id;

                    if (!params.id && !params.parentId) {
                        throw new Error("Must specify either comment_ids or parent_comment_id");
                    }
                    const res = await youtube.comments.list(params);
                    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
                }

                case "get_video_captions_metadata": {
                    if (!args || !isString(args.video_id)) throw new Error("Missing video_id");
                    const res = await youtube.captions.list({
                        part: ["snippet"],
                        videoId: args.video_id,
                    });
                    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
                }

                case "download_video_caption": {
                    if (!args || !isString(args.video_id)) throw new Error("Missing video_id");
                    try {
                        const output: any = await ytDlp(`https://www.youtube.com/watch?v=${args.video_id}`, {
                            dumpJson: true,
                            skipDownload: true,
                        });

                        const subs = output.subtitles || {};
                        const autoSubs = output.automatic_captions || {};

                        // Try to find English captions first, then fallback to any available
                        let targetLanguage = 'en';
                        let captionsList = subs[targetLanguage] || autoSubs[targetLanguage] || subs['en-US'] || autoSubs['en-US'];

                        if (!captionsList) {
                            const availableLangs = [...Object.keys(subs), ...Object.keys(autoSubs)];
                            if (availableLangs.length === 0) {
                                return { content: [{ type: "text", text: "No captions available for this video." }] };
                            }
                            targetLanguage = availableLangs[0];
                            captionsList = subs[targetLanguage] || autoSubs[targetLanguage];
                        }

                        // Prefer VTT format, fallback to the first available format
                        const captionTrack = captionsList.find((c: any) => c.ext === 'vtt') || captionsList[0];
                        if (!captionTrack || !captionTrack.url) {
                            return { content: [{ type: "text", text: "Caption track URL not found in metadata." }] };
                        }

                        // Fetch the caption text
                        const captionRes = await fetch(captionTrack.url);
                        if (!captionRes.ok) {
                            return { content: [{ type: "text", text: `Failed to download caption: ${captionRes.statusText}` }], isError: true };
                        }

                        const text = await captionRes.text();
                        return { content: [{ type: "text", text }] };
                    } catch (e: any) {
                        return { content: [{ type: "text", text: `Error fetching transcript via yt-dlp: ${e.message}` }], isError: true };
                    }
                }



                case "get_activities_list": {
                    const params: any = {
                        part: ["snippet", "contentDetails"],
                        maxResults: parseNumber(args?.max_results) || 5,
                    };
                    if (args?.channel_id && isString(args.channel_id)) params.channelId = args.channel_id;
                    if (args?.mine === true) params.mine = true;

                    if (!params.channelId && !params.mine) {
                        throw new Error("Must specify either channel_id or mine=true");
                    }
                    const res = await youtube.activities.list(params);
                    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
                }

                case "get_channel_sections": {
                    const params: any = {
                        part: ["snippet", "contentDetails"],
                    };
                    if (args?.channel_id && isString(args.channel_id)) params.channelId = args.channel_id;
                    if (args?.mine === true) params.mine = true;

                    if (!params.channelId && !params.mine) {
                        throw new Error("Must specify either channel_id or mine=true");
                    }
                    const res = await youtube.channelSections.list(params);
                    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
                }

                case "get_members_list": {
                    const res = await youtube.members.list({
                        part: ["snippet"],
                        maxResults: parseNumber(args?.max_results) || 5,
                    });
                    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
                }

                case "get_memberships_levels": {
                    const res = await youtube.membershipsLevels.list({
                        part: ["snippet"],
                    });
                    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
                }

                case "get_subscriptions_list": {
                    const params: any = {
                        part: ["snippet", "contentDetails"],
                        maxResults: parseNumber(args?.max_results) || 5,
                    };
                    if (args?.channel_id && isString(args.channel_id)) params.channelId = args.channel_id;
                    if (args?.mine === true) params.mine = true;
                    if (args?.for_channel_id && isString(args.for_channel_id)) params.forChannelId = args.for_channel_id;

                    if (!params.channelId && !params.mine) {
                        throw new Error("Must specify either channel_id or mine=true");
                    }
                    const res = await youtube.subscriptions.list(params);
                    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
                }

                default:
                    throw new McpError(
                        ErrorCode.MethodNotFound,
                        `Unknown tool: ${name}`
                    );
            }
        } catch (error: any) {
            if (error instanceof McpError) throw error;

            console.error(`Error executing tool ${name}:`, error.message);
            return {
                content: [{ type: "text", text: `Error: ${error.message}` }],
                isError: true,
            };
        }
    });

    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("YouTube MCP Server is running and listening on stdio.");
}

runServer().catch((error) => {
    console.error("Fatal error running server:", error);
    process.exit(1);
});
