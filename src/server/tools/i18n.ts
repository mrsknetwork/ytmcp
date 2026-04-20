import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ytApiRequest, success, formatError } from "../api-client.js";

const GetSupportedLanguagesSchema = {
    language_code: z.string().optional().describe("Language code for localized names"),
};

const GetSupportedRegionsSchema = {
    language_code: z.string().optional().describe("Language code for localized names"),
};

export function registerI18nTools(server: McpServer): void {

    server.registerTool(
        "list_supported_languages",
        {
            description: "List all languages supported by YouTube (e.g., for caption and UI localization). Returns items[].snippet.hl (language code) and items[].snippet.name (human-readable name). Optionally pass language_code to get names localized in that language.",
            inputSchema: GetSupportedLanguagesSchema,
            annotations: { readOnlyHint: true, openWorldHint: true, idempotentHint: true },
        },
        async (args) => {
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

    server.registerTool(
        "list_supported_regions",
        {
            description: "List all geographic regions supported by YouTube content targeting. Returns items[].snippet.gl (region code, e.g., 'US') and items[].snippet.name. Use region codes with list_video_categories or search_content to geo-filter results.",
            inputSchema: GetSupportedRegionsSchema,
            annotations: { readOnlyHint: true, openWorldHint: true, idempotentHint: true },
        },
        async (args) => {
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
}
