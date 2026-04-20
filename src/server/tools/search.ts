import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ytApiRequest, success, formatError } from "../api-client.js";

const SearchYoutubeContentSchema = {
    search_query: z.string().describe("Search query"),
    max_results: z.number().optional().describe("Default is 5. Max is 50."),
    content_type: z.string().optional().describe("Comma-separated list (e.g., 'video,channel,playlist')"),
    order: z.enum(["relevance", "date", "rating", "viewCount", "title", "videoCount"]).optional().describe("Sort order for results. Use 'date' for newest first, 'viewCount' for most watched, 'rating' for top rated."),
    published_after: z.string().optional().describe("RFC 3339 datetime (e.g., '2024-01-01T00:00:00Z'). Only return results published after this time."),
    published_before: z.string().optional().describe("RFC 3339 datetime (e.g., '2024-12-31T23:59:59Z'). Only return results published before this time."),
    video_duration: z.enum(["short", "medium", "long"]).optional().describe("Filter by video duration — short (<4 min), medium (4-20 min), long (>20 min). Only applies when content_type includes 'video'."),
    video_definition: z.enum(["hd", "standard"]).optional().describe("Filter by video quality — 'hd' or 'standard'. Only applies when content_type includes 'video'."),
    region_code: z.string().optional().describe("ISO 3166-1 alpha-2 country code (e.g., 'US', 'GB', 'IN') to geo-restrict search results."),
    page_token: z.string().optional().describe("Token from a previous response to fetch the next page of results."),
};

export function registerSearchTools(server: McpServer): void {
    server.registerTool(
        "search_content",
        {
            description: "Search YouTube for videos, channels, or playlists. Returns items[].id (videoId/channelId/playlistId) and items[].snippet (title, description, thumbnails, channelTitle, publishedAt). Use content_type to filter by resource type. Use page_token from a previous response to paginate additional pages.",
            inputSchema: SearchYoutubeContentSchema,
            annotations: { readOnlyHint: true, openWorldHint: true },
        },
        async (args) => {
            try {
                const data = await ytApiRequest("search", {
                    q: args.search_query,
                    maxResults: args.max_results ?? 5,
                    type: args.content_type ?? undefined,
                    order: args.order,
                    publishedAfter: args.published_after,
                    publishedBefore: args.published_before,
                    videoDuration: args.video_duration,
                    videoDefinition: args.video_definition,
                    regionCode: args.region_code,
                    pageToken: args.page_token,
                });
                return success(data);
            } catch (error) {
                return formatError(error);
            }
        }
    );
}
