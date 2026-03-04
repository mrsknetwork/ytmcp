#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { authorize, revokeToken } from "./auth.js";
import dotenv from "dotenv";
import ytDlp from "yt-dlp-exec";
import { z } from "zod";

// Ensure no library, including dotenv or yt-dlp, accidentally logs to stdout and breaks MCP protocol
console.log = console.error;

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    dotenv.config();
}

let authPromise: Promise<any> | null = null;
let currentAuthType: string | null = null;
let currentCredentials: any = null;

async function getCredentials(apiKey?: string) {
    if (currentCredentials) return currentCredentials;
    if (!authPromise) {
        authPromise = authorize(apiKey)
            .then((authResult) => {
                currentAuthType = authResult.type;
                currentCredentials = authResult;

                if (authResult.type === 'apiKey') {
                    console.error("Authenticated using Google API Key.");
                } else if (authResult.type === 'oauth') {
                    console.error("Authenticated using OAuth2.");
                } else {
                    console.error("Starting in Guest Mode (No credentials found).");
                }
                return currentCredentials;
            })
            .catch((err) => {
                authPromise = null;
                throw err;
            });
    }
    return authPromise;
}

async function ensureClientValid() {
    const creds = await getCredentials(process.argv[2]);
    if (currentAuthType === 'guest') {
        throw new Error("No authentication credentials found (Guest Mode). To use this tool, please provide a GOOGLE_API_KEY or set up OAuth2 Client ID/Secret.");
    }
    return creds;
}

// ----------------------------------------------------------------------
// Native Fetch API Wrapper
// ----------------------------------------------------------------------

async function ytApiRequest(endpoint: string, params: Record<string, string | number | boolean | undefined | string[]>) {
    const creds = await ensureClientValid();

    const url = new URL(`https://youtube.googleapis.com/youtube/v3/${endpoint}`);

    // Add common part if mostly needed
    if (!params.part && endpoint !== 'videoCategories' && endpoint !== 'i18nLanguages' && endpoint !== 'i18nRegions' && endpoint !== 'captions' && endpoint !== 'membershipsLevels') {
        params.part = "snippet,id";
    }

    if (creds.type === 'apiKey') {
        url.searchParams.append('key', creds.key);
    }

    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
            if (Array.isArray(value)) {
                url.searchParams.append(key, value.join(','));
            } else {
                url.searchParams.append(key, String(value));
            }
        }
    });

    const headers: Record<string, string> = {
        'Accept': 'application/json'
    };

    if (creds.type === 'oauth') {
        const token = await creds.client.getAccessToken();
        headers['Authorization'] = `Bearer ${token.token}`;
    }

    const res = await fetch(url.toString(), { headers });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`YouTube API Error: ${res.status} ${res.statusText} - ${errText}`);
    }

    return await res.json();
}

function success(data: any) {
    return {
        content: [{ type: "text", text: typeof data === 'string' ? data : JSON.stringify(data, null, 2) }]
    };
}

function formatError(error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
        content: [{ type: "text", text: `Error: ${message}` }],
        isError: true
    };
}

const server = new McpServer({
    name: "@mrsknetwork/ytmcp",
    version: "1.0.8",
});

// ----------------------------------------------------------------------
// Schemas
// ----------------------------------------------------------------------

const SearchYoutubeContentSchema = z.object({
    search_query: z.string().describe("Search query"),
    max_results: z.number().optional().describe("Default is 5. Max is 50."),
    content_type: z.string().optional().describe("Comma-separated list (e.g., 'video,channel,playlist')"),
});

const GetVideoDetailsSchema = z.object({
    video_ids: z.string().optional().describe("Comma-separated video IDs"),
    chart_type: z.string().optional().describe("E.g., 'mostPopular'"),
    category_id: z.string().optional().describe("Used with chart_type='mostPopular'"),
    max_results: z.number().optional().describe("Default 5"),
});

const GetChannelDetailsSchema = z.object({
    channel_ids: z.string().optional().describe("Comma-separated channel IDs"),
    username: z.string().optional().describe("A YouTube username"),
    max_results: z.number().optional().describe("Default 5"),
});

const GetVideoCategoriesSchema = z.object({
    region_code: z.string().describe("e.g., 'US', 'IN'"),
});

const GetSupportedLanguagesSchema = z.object({
    language_code: z.string().optional().describe("Language code for localized names"),
});

const GetSupportedRegionsSchema = z.object({
    language_code: z.string().optional().describe("Language code for localized names"),
});

const GetPlaylistsSchema = z.object({
    playlist_ids: z.string().optional().describe("Comma-separated playlist IDs"),
    channel_id: z.string().optional().describe("Channel ID to get playlists for"),
    max_results: z.number().optional().describe("Default 5"),
});

const GetPlaylistItemsSchema = z.object({
    playlist_id: z.string().describe("The ID of the playlist"),
    max_results: z.number().optional().describe("Default 5"),
});

const GetCommentThreadsSchema = z.object({
    video_id: z.string().optional().describe("The video ID"),
    channel_id: z.string().optional().describe("The channel ID"),
    search_terms: z.string().optional().describe("Search query in comments"),
    max_results: z.number().optional().describe("Default 5"),
});

const GetCommentsRepliesSchema = z.object({
    comment_ids: z.string().optional().describe("Comma-separated comment IDs"),
    parent_comment_id: z.string().optional().describe("Parent comment ID to get replies"),
    max_results: z.number().optional().describe("Default 5"),
});

const GetVideoCaptionsMetadataSchema = z.object({
    video_id: z.string().describe("The video ID"),
});

const DownloadVideoCaptionSchema = z.object({
    video_id: z.string().describe("The ID of the YouTube video to download the transcript for"),
});

const GetActivitiesListSchema = z.object({
    channel_id: z.string().optional().describe("Channel ID to fetch activities for"),
    mine: z.boolean().optional().describe("Set to true to fetch the authenticated user's activities"),
    max_results: z.number().optional().describe("Default 5"),
});

const GetChannelSectionsSchema = z.object({
    channel_id: z.string().optional().describe("Channel ID to fetch sections for"),
    mine: z.boolean().optional().describe("Set to true to fetch the authenticated user's sections"),
});

const GetMembersListSchema = z.object({
    max_results: z.number().optional().describe("Default 5"),
});

const GetMembershipsLevelsSchema = z.object({});

const GetSubscriptionsListSchema = z.object({
    channel_id: z.string().optional().describe("Channel ID to fetch subscriptions for"),
    mine: z.boolean().optional().describe("Set to true to fetch the authenticated user's subscriptions"),
    for_channel_id: z.string().optional().describe("Comma-separated list of channel IDs to check if the user is subscribed to"),
    max_results: z.number().optional().describe("Default 5"),
});

const RevokeAuthenticationSchema = z.object({});

// ----------------------------------------------------------------------
// Tool Registrations
// ----------------------------------------------------------------------

(server as any).registerTool(
    "search_youtube_content",
    {
        description: "Search for videos, channels, or playlists on YouTube.",
        inputSchema: SearchYoutubeContentSchema
    },
    async (args: any) => {
        try {
            const data = await ytApiRequest("search", {
                q: args.search_query,
                maxResults: args.max_results || 5,
                type: args.content_type ? args.content_type : undefined,
            });
            return success(data);
        } catch (error) {
            return formatError(error);
        }
    }
);

(server as any).registerTool(
    "get_video_details",
    {
        description: "Get metadata for specific videos by ID, or get the most popular videos.",
        inputSchema: GetVideoDetailsSchema
    },
    async (args: any) => {
        try {
            const params: any = {
                part: "snippet,contentDetails,statistics",
                maxResults: args.max_results || 5,
            };
            if (args.video_ids) params.id = args.video_ids;
            if (args.chart_type) params.chart = args.chart_type;
            if (args.category_id) params.videoCategoryId = args.category_id;

            if (!params.id && !params.chart) {
                return formatError("Must specify either video_ids or chart_type");
            }
            const data = await ytApiRequest("videos", params);
            return success(data);
        } catch (error) {
            return formatError(error);
        }
    }
);

(server as any).registerTool(
    "get_channel_details",
    {
        description: "Get channel information by ID or username.",
        inputSchema: GetChannelDetailsSchema
    },
    async (args: any) => {
        try {
            const params: any = {
                part: "snippet,statistics,contentDetails",
                maxResults: args.max_results || 5,
            };
            if (args.channel_ids) params.id = args.channel_ids;
            if (args.username) params.forUsername = args.username;

            if (!params.id && !params.forUsername) {
                return formatError("Must specify either channel_ids or username");
            }
            const data = await ytApiRequest("channels", params);
            return success(data);
        } catch (error) {
            return formatError(error);
        }
    }
);

(server as any).registerTool(
    "get_video_categories",
    {
        description: "Get standard video categories.",
        inputSchema: GetVideoCategoriesSchema
    },
    async (args: any) => {
        try {
            const data = await ytApiRequest("videoCategories", {
                part: "snippet",
                regionCode: args.region_code,
            });
            return success(data);
        } catch (error) {
            return formatError(error);
        }
    }
);

(server as any).registerTool(
    "get_supported_languages",
    {
        description: "Get supported languages on YouTube.",
        inputSchema: GetSupportedLanguagesSchema
    },
    async (args: any) => {
        try {
            const data = await ytApiRequest("i18nLanguages", {
                part: "snippet",
                hl: args.language_code,
            });
            return success(data);
        } catch (error) {
            return formatError(error);
        }
    }
);

(server as any).registerTool(
    "get_supported_regions",
    {
        description: "Get supported regions on YouTube.",
        inputSchema: GetSupportedRegionsSchema
    },
    async (args: any) => {
        try {
            const data = await ytApiRequest("i18nRegions", {
                part: "snippet",
                hl: args.language_code,
            });
            return success(data);
        } catch (error) {
            return formatError(error);
        }
    }
);

(server as any).registerTool(
    "get_playlists",
    {
        description: "Get user or channel playlists.",
        inputSchema: GetPlaylistsSchema
    },
    async (args: any) => {
        try {
            const params: any = {
                part: "snippet,contentDetails",
                maxResults: args.max_results || 5,
            };
            if (args.playlist_ids) params.id = args.playlist_ids;
            if (args.channel_id) params.channelId = args.channel_id;

            if (!params.id && !params.channelId) {
                return formatError("Must specify either playlist_ids or channel_id");
            }
            const data = await ytApiRequest("playlists", params);
            return success(data);
        } catch (error) {
            return formatError(error);
        }
    }
);

(server as any).registerTool(
    "get_playlist_items",
    {
        description: "Get items within a playlist.",
        inputSchema: GetPlaylistItemsSchema
    },
    async (args: any) => {
        try {
            const data = await ytApiRequest("playlistItems", {
                part: "snippet,contentDetails",
                playlistId: args.playlist_id,
                maxResults: args.max_results || 5,
            });
            return success(data);
        } catch (error) {
            return formatError(error);
        }
    }
);

(server as any).registerTool(
    "get_comment_threads",
    {
        description: "Get top-level comment threads for a video or channel.",
        inputSchema: GetCommentThreadsSchema
    },
    async (args: any) => {
        try {
            const params: any = {
                part: "snippet,replies",
                maxResults: args.max_results || 5,
            };
            if (args.video_id) params.videoId = args.video_id;
            if (args.channel_id) params.channelId = args.channel_id;
            if (args.search_terms) params.searchTerms = args.search_terms;

            if (!params.videoId && !params.channelId) {
                return formatError("Must specify either video_id or channel_id");
            }
            const data = await ytApiRequest("commentThreads", params);
            return success(data);
        } catch (error) {
            return formatError(error);
        }
    }
);

(server as any).registerTool(
    "get_comments_replies",
    {
        description: "Get specific comments by ID or parent ID (replies).",
        inputSchema: GetCommentsRepliesSchema
    },
    async (args: any) => {
        try {
            const params: any = {
                part: "snippet",
                maxResults: args.max_results || 5,
            };
            if (args.comment_ids) params.id = args.comment_ids;
            if (args.parent_comment_id) params.parentId = args.parent_comment_id;

            if (!params.id && !params.parentId) {
                return formatError("Must specify either comment_ids or parent_comment_id");
            }
            const data = await ytApiRequest("comments", params);
            return success(data);
        } catch (error) {
            return formatError(error);
        }
    }
);

(server as any).registerTool(
    "get_video_captions_metadata",
    {
        description: "Get caption tracks metadata for a video.",
        inputSchema: GetVideoCaptionsMetadataSchema
    },
    async (args: any) => {
        try {
            const data = await ytApiRequest("captions", {
                part: "snippet",
                videoId: args.video_id,
            });
            return success(data);
        } catch (error) {
            return formatError(error);
        }
    }
);

(server as any).registerTool(
    "download_video_caption",
    {
        description: "Download the transcript/caption text of a YouTube video using yt-dlp (bypasses API restrictions).",
        inputSchema: DownloadVideoCaptionSchema
    },
    async (args: any) => {
        try {
            const output: any = await ytDlp(`https://www.youtube.com/watch?v=${args.video_id}`, {
                dumpJson: true,
                skipDownload: true,
            });

            const autoSubs = output.automatic_captions || {};
            const subs = output.subtitles || {};

            let captionsList = subs['en'] || autoSubs['en'] || subs['en-US'] || autoSubs['en-US'];

            if (!captionsList) {
                const availableLangs = [...Object.keys(subs), ...Object.keys(autoSubs)];
                if (availableLangs.length === 0) return formatError("No captions found.");
                captionsList = subs[availableLangs[0]] || autoSubs[availableLangs[0]];
            }

            const track = captionsList.find((c: any) => c.ext === 'vtt') || captionsList[0];
            if (!track?.url) return formatError("No valid caption track URL found.");

            const res = await fetch(track.url);
            const vtt = await res.text();

            const cleanText = vtt
                .replace(/^WEBVTT.*?(\r?\n\r?\n)/s, '')
                .replace(/^\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3}.*?\r?\n/gm, '')
                .replace(/<[^>]+>/g, '')
                .split('\n')
                .map(l => l.trim())
                .filter(l => l.length > 0)
                .join(' ');

            return success(cleanText);
        } catch (error) {
            return formatError(`Error fetching transcript via yt-dlp: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
);

(server as any).registerTool(
    "get_activities_list",
    {
        description: "Get a list of channel activities (e.g., uploads, likes).",
        inputSchema: GetActivitiesListSchema
    },
    async (args: any) => {
        try {
            const params: any = {
                part: "snippet,contentDetails",
                maxResults: args.max_results || 5,
            };
            if (args.channel_id) params.channelId = args.channel_id;
            if (args.mine === true) params.mine = true;

            if (!params.channelId && !params.mine) {
                return formatError("Must specify either channel_id or mine=true");
            }
            const data = await ytApiRequest("activities", params);
            return success(data);
        } catch (error) {
            return formatError(error);
        }
    }
);

(server as any).registerTool(
    "get_channel_sections",
    {
        description: "Get the channel sections/shelves for a channel.",
        inputSchema: GetChannelSectionsSchema
    },
    async (args: any) => {
        try {
            const params: any = {
                part: "snippet,contentDetails",
            };
            if (args.channel_id) params.channelId = args.channel_id;
            if (args.mine === true) params.mine = true;

            if (!params.channelId && !params.mine) {
                return formatError("Must specify either channel_id or mine=true");
            }
            const data = await ytApiRequest("channelSections", params);
            return success(data);
        } catch (error) {
            return formatError(error);
        }
    }
);

(server as any).registerTool(
    "get_members_list",
    {
        description: "Get members for the authenticated user's channel. (May require specific memberships scope & monetization enabled).",
        inputSchema: GetMembersListSchema
    },
    async (args: any) => {
        try {
            const data = await ytApiRequest("members", {
                part: "snippet",
                maxResults: args.max_results || 5,
            });
            return success(data);
        } catch (error) {
            return formatError(error);
        }
    }
);

(server as any).registerTool(
    "get_memberships_levels",
    {
        description: "Get pricing levels for the authenticated user's channel. (May require specific memberships scope).",
        inputSchema: GetMembershipsLevelsSchema
    },
    async () => {
        try {
            const data = await ytApiRequest("membershipsLevels", {
                part: "snippet",
            });
            return success(data);
        } catch (error) {
            return formatError(error);
        }
    }
);

(server as any).registerTool(
    "get_subscriptions_list",
    {
        description: "Get a list of subscriptions for a user or channel.",
        inputSchema: GetSubscriptionsListSchema
    },
    async (args: any) => {
        try {
            const params: any = {
                part: "snippet,contentDetails",
                maxResults: args.max_results || 5,
            };
            if (args.channel_id) params.channelId = args.channel_id;
            if (args.mine === true) params.mine = true;
            if (args.for_channel_id) params.forChannelId = args.for_channel_id;

            if (!params.channelId && !params.mine) {
                return formatError("Must specify either channel_id or mine=true");
            }
            const data = await ytApiRequest("subscriptions", params);
            return success(data);
        } catch (error) {
            return formatError(error);
        }
    }
);

(server as any).registerTool(
    "revoke_authentication",
    {
        description: "Revoke all stored YouTube authentication tokens and sign out.",
        inputSchema: RevokeAuthenticationSchema
    },
    async () => {
        try {
            await revokeToken();
            authPromise = null;
            currentAuthType = null;
            currentCredentials = null;
            return success("Successfully revoked tokens and signed out.");
        } catch (error) {
            return formatError(error);
        }
    }
);

async function runServer() {
    console.error("Starting YouTube MCP Server...");

    const transport = new StdioServerTransport();
    await server.connect(transport);
}

runServer().catch((error) => {
    console.error("Fatal error running server:", error);
    process.exit(1);
});
