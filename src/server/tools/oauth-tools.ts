import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ytApiRequest, success, formatError, ensureApiAccess, ensureOAuthAccess, ApiParams } from "../api-client.js";
import { revokeToken } from "../auth.js";

const GetSubscriptionsListSchema = {
    channel_id: z.string().optional().describe("Channel ID to fetch subscriptions for"),
    mine: z.boolean().optional().describe("Set to true to fetch the authenticated user's subscriptions"),
    for_channel_id: z.string().optional().describe("Comma-separated list of channel IDs to check if the user is subscribed to"),
    max_results: z.number().optional().describe("Default 5"),
    page_token: z.string().optional().describe("Token from a previous response to fetch the next page of results."),
};

const GetMembersListSchema = {
    max_results: z.number().optional().describe("Default 5"),
};

const GetMembershipsLevelsSchema = {};

export function registerOAuthTools(server: McpServer): void {

    server.registerTool(
        "list_subscriptions",
        {
            description: "List a channel's public subscriptions by channel_id (requires API Key), or list your own subscriptions with mine=true (requires OAuth). Returns snippet (title, description, resourceId.channelId) and contentDetails (totalItemCount, newItemCount). Use for_channel_id to check if a channel is subscribed to specific channels. Use page_token to paginate.",
            inputSchema: GetSubscriptionsListSchema,
            annotations: { readOnlyHint: true, openWorldHint: true },
        },
        async (args) => {
            try {
                // Only require OAuth when fetching the authenticated user's own subscriptions
                if (args.mine === true) {
                    await ensureOAuthAccess();
                } else {
                    await ensureApiAccess();
                }

                const params: ApiParams = {
                    part: "snippet,contentDetails",
                    maxResults: args.max_results ?? 5,
                };
                if (args.channel_id) params.channelId = args.channel_id;
                if (args.mine === true) params.mine = true;
                if (args.for_channel_id) params.forChannelId = args.for_channel_id;
                if (args.page_token) params.pageToken = args.page_token;

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

    server.registerTool(
        "list_channel_members",
        {
            description: "List current paying members of the authenticated user's channel. Requires OAuth with the YouTube channel membership scope and an active memberships program on the channel. Returns snippet (memberDetails.channelId, creatorChannelId, membershipsDetails.highestActiveLevel.displayName).",
            inputSchema: GetMembersListSchema,
            annotations: { readOnlyHint: true, openWorldHint: true },
        },
        async (args) => {
            try {
                await ensureOAuthAccess();
                const data = await ytApiRequest("members", {
                    part: "snippet",
                    maxResults: args.max_results ?? 5,
                });
                return success(data);
            } catch (error) {
                return formatError(error);
            }
        }
    );

    server.registerTool(
        "list_membership_levels",
        {
            description: "List the membership tier pricing levels configured for the authenticated user's channel. Requires OAuth. Returns items[].snippet.levelDetails.displayName for each tier (e.g., 'Member', 'Super Fan'). Use alongside list_channel_members to understand which tier each member belongs to.",
            inputSchema: GetMembershipsLevelsSchema,
            annotations: { readOnlyHint: true, openWorldHint: true },
        },
        async () => {
            try {
                await ensureOAuthAccess();
                const data = await ytApiRequest("membershipsLevels", {
                    part: "snippet",
                });
                return success(data);
            } catch (error) {
                return formatError(error);
            }
        }
    );

    // ── Task 4.5: revoke_oauth_token ──────────────────────────────────────────
    server.registerTool(
        "revoke_oauth_token",
        {
            description: "Revoke the stored OAuth token and sign the user out of the YouTube MCP server. Calls Google's token revocation endpoint, deletes the local token file (~/.ytmcp_tokens.json), and clears the in-process auth cache. After revoking, any tool that requires OAuth will prompt the user to re-authenticate. Requires OAuth.",
            inputSchema: {},
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async () => {
            try {
                await ensureOAuthAccess();
                await revokeToken();
                return success("OAuth token successfully revoked. The local token file has been deleted. You will need to re-authenticate with Google to use OAuth-protected tools.");
            } catch (error) {
                return formatError(error);
            }
        }
    );
}
