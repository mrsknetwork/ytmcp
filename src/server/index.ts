#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerSearchTools } from "./tools/search.js";
import { registerVideoTools } from "./tools/videos.js";
import { registerChannelTools } from "./tools/channels.js";
import { registerPlaylistTools } from "./tools/playlists.js";
import { registerCommentTools } from "./tools/comments.js";
import { registerOAuthTools } from "./tools/oauth-tools.js";
import { registerI18nTools } from "./tools/i18n.js";

// Ensure no library accidentally logs to stdout and breaks MCP protocol
console.log = console.error;

const server = new McpServer({
    name: "@mrsknetwork/ytmcp",
    version: "1.0.9",
});

// Register all tools grouped by domain
registerSearchTools(server);
registerVideoTools(server);
registerChannelTools(server);
registerPlaylistTools(server);
registerCommentTools(server);
registerOAuthTools(server);
registerI18nTools(server);

async function runServer() {
    console.error("Starting YouTube MCP Server...");
    const transport = new StdioServerTransport();
    await server.connect(transport);
}

runServer().catch((error) => {
    console.error("Fatal error running server:", error);
    process.exit(1);
});
