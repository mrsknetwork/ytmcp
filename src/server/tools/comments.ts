import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ytApiRequest, success, formatError, ApiParams } from "../api-client.js";

const GetCommentThreadsSchema = {
    video_id: z.string().optional().describe("The video ID"),
    channel_id: z.string().optional().describe("The channel ID"),
    search_terms: z.string().optional().describe("Search query in comments"),
    max_results: z.number().optional().describe("Default 5"),
    page_token: z.string().optional().describe("Token from a previous response to fetch the next page of results."),
};

const GetCommentsRepliesSchema = {
    comment_ids: z.string().optional().describe("Comma-separated comment IDs"),
    parent_comment_id: z.string().optional().describe("Parent comment ID to get replies"),
    max_results: z.number().optional().describe("Default 5"),
    page_token: z.string().optional().describe("Token from a previous response to fetch the next page of results."),
};

export function registerCommentTools(server: McpServer): void {

    server.registerTool(
        "list_video_comments",
        {
            description: "Fetch top-level comment threads for a video or all comments on a channel. Returns snippet.topLevelComment (authorDisplayName, textDisplay, likeCount, publishedAt) and replies.comments[] for threaded replies. Use search_terms to filter comments containing a specific phrase. Use page_token to paginate.",
            inputSchema: GetCommentThreadsSchema,
            annotations: { readOnlyHint: true, openWorldHint: true },
        },
        async (args) => {
            try {
                const params: ApiParams = {
                    part: "snippet,replies",
                    maxResults: args.max_results ?? 5,
                };
                if (args.video_id) params.videoId = args.video_id;
                if (args.channel_id) params.channelId = args.channel_id;
                if (args.search_terms) params.searchTerms = args.search_terms;
                if (args.page_token) params.pageToken = args.page_token;

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

    server.registerTool(
        "list_comment_replies",
        {
            description: "Fetch replies to a specific comment thread using parent_comment_id, or fetch individual comments by comma-separated comment_ids. Returns snippet (textDisplay, authorDisplayName, likeCount, publishedAt, parentId). Use page_token to paginate through large reply threads.",
            inputSchema: GetCommentsRepliesSchema,
            annotations: { readOnlyHint: true, openWorldHint: true },
        },
        async (args) => {
            try {
                const params: ApiParams = {
                    part: "snippet",
                    maxResults: args.max_results ?? 5,
                };
                if (args.comment_ids) params.id = args.comment_ids;
                if (args.parent_comment_id) params.parentId = args.parent_comment_id;
                if (args.page_token) params.pageToken = args.page_token;

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
}
