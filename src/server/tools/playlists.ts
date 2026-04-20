import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ytApiRequest, success, successStructured, formatError, PlaylistListOutputSchema, ApiParams } from "../api-client.js";

const GetPlaylistsSchema = {
    playlist_ids: z.string().optional().describe("Comma-separated playlist IDs"),
    channel_id: z.string().optional().describe("Channel ID to get playlists for"),
    max_results: z.number().optional().describe("Default 5"),
    page_token: z.string().optional().describe("Token from a previous response to fetch the next page of results."),
};

const GetPlaylistItemsSchema = {
    playlist_id: z.string().describe("The ID of the playlist"),
    max_results: z.number().optional().describe("Default 5"),
    page_token: z.string().optional().describe("Token from a previous response to fetch the next page of results."),
};

export function registerPlaylistTools(server: McpServer): void {

    server.registerTool(
        "list_playlists",
        {
            description: "List playlists belonging to a channel or fetch specific playlists by ID. Returns snippet (title, description, channelId, thumbnails) and contentDetails (itemCount). Use list_playlist_items with the returned playlist id to browse all videos inside a playlist. Use page_token to paginate.",
            inputSchema: GetPlaylistsSchema,
            outputSchema: PlaylistListOutputSchema,
            annotations: { readOnlyHint: true, openWorldHint: true },
        },
        async (args) => {
            try {
                const params: ApiParams = {
                    part: "snippet,contentDetails",
                    maxResults: args.max_results ?? 5,
                };
                if (args.playlist_ids) params.id = args.playlist_ids;
                if (args.channel_id) params.channelId = args.channel_id;
                if (args.page_token) params.pageToken = args.page_token;

                if (!params.id && !params.channelId) {
                    return formatError("Must specify either playlist_ids or channel_id");
                }
                const data = await ytApiRequest("playlists", params);
                return successStructured(data);
            } catch (error) {
                return formatError(error);
            }
        }
    );

    server.registerTool(
        "list_playlist_items",
        {
            description: "List video entries inside a YouTube playlist in order. Returns snippet (title, description, position, videoOwnerChannelTitle, thumbnails) and contentDetails (videoId). Use the videoId values with get_video_metadata or get_video_transcript for further detail. Use page_token to walk through all items.",
            inputSchema: GetPlaylistItemsSchema,
            annotations: { readOnlyHint: true, openWorldHint: true },
        },
        async (args) => {
            try {
                const data = await ytApiRequest("playlistItems", {
                    part: "snippet,contentDetails",
                    playlistId: args.playlist_id,
                    maxResults: args.max_results ?? 5,
                    pageToken: args.page_token,
                });
                return success(data);
            } catch (error) {
                return formatError(error);
            }
        }
    );
}
