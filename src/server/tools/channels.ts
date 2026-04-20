import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ytApiRequest, success, successStructured, formatError, ChannelListOutputSchema, ApiParams } from "../api-client.js";

const GetChannelDetailsSchema = {
    channel_ids: z.string().optional().describe("Comma-separated channel IDs"),
    handle: z.string().optional().describe("A YouTube channel handle (e.g., '@MrBeast' or 'MrBeast')"),
    max_results: z.number().optional().describe("Default 5"),
};

const GetActivitiesListSchema = {
    channel_id: z.string().optional().describe("Channel ID to fetch activities for"),
    mine: z.boolean().optional().describe("Set to true to fetch the authenticated user's activities"),
    max_results: z.number().optional().describe("Default 5"),
    page_token: z.string().optional().describe("Token from a previous response to fetch the next page of results."),
};

const GetChannelSectionsSchema = {
    channel_id: z.string().optional().describe("Channel ID to fetch sections for"),
    mine: z.boolean().optional().describe("Set to true to fetch the authenticated user's sections"),
};

export function registerChannelTools(server: McpServer): void {

    server.registerTool(
        "get_channel_metadata",
        {
            description: "Fetch channel profile, statistics, and content details by channel ID or @handle. Returns snippet (title, description, country, thumbnails), statistics (subscriberCount, videoCount, viewCount), and contentDetails (uploads playlist ID — use with list_playlist_items to browse all channel videos). Accepts either channel_ids (comma-separated) or handle (e.g., '@MrBeast').",
            inputSchema: GetChannelDetailsSchema,
            outputSchema: ChannelListOutputSchema,
            annotations: { readOnlyHint: true, openWorldHint: true },
        },
        async (args) => {
            try {
                const params: ApiParams = {
                    part: "snippet,statistics,contentDetails",
                    maxResults: args.max_results ?? 5,
                };
                if (args.channel_ids) params.id = args.channel_ids;
                if (args.handle) {
                    params.forHandle = args.handle.startsWith('@') ? args.handle : `@${args.handle}`;
                }

                if (!params.id && !params.forHandle) {
                    return formatError("Must specify either channel_ids or handle (e.g., '@MrBeast')");
                }
                const data = await ytApiRequest("channels", params);
                return successStructured(data);
            } catch (error) {
                return formatError(error);
            }
        }
    );

    server.registerTool(
        "list_channel_activities",
        {
            description: "Get a chronological feed of a channel's recent actions such as uploads, playlist additions, and recommendations. Returns snippet (type, publishedAt, title) and contentDetails (upload.videoId, playlist.playlistId). Useful for tracking what a channel has posted recently. Use page_token to paginate.",
            inputSchema: GetActivitiesListSchema,
            annotations: { readOnlyHint: true, openWorldHint: true },
        },
        async (args) => {
            try {
                const params: ApiParams = {
                    part: "snippet,contentDetails",
                    maxResults: args.max_results ?? 5,
                };
                if (args.channel_id) params.channelId = args.channel_id;
                if (args.mine === true) params.mine = true;
                if (args.page_token) params.pageToken = args.page_token;

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

    server.registerTool(
        "list_channel_sections",
        {
            description: "Get the shelf and section layout of a YouTube channel page (e.g., 'Featured Videos', 'Popular Uploads', 'Single Playlist'). Returns snippet (title, type, style, position) and contentDetails (playlists[], channels[]). Useful for understanding how a channel organizes and surfaces its content.",
            inputSchema: GetChannelSectionsSchema,
            annotations: { readOnlyHint: true, openWorldHint: true },
        },
        async (args) => {
            try {
                const params: ApiParams = { part: "snippet,contentDetails" };
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
}
