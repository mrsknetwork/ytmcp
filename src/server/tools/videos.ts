import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import ytDlp from "yt-dlp-exec";
import {
    ytApiRequest,
    success,
    successStructured,
    formatError,
    VideoListOutputSchema,
    ApiParams,
} from "../api-client.js";

// ── Input Schemas ──────────────────────────────────────────────────────────────

const GetVideoDetailsSchema = {
    video_ids: z.string().optional().describe("Comma-separated video IDs"),
    chart_type: z.string().optional().describe("E.g., 'mostPopular'"),
    category_id: z.string().optional().describe("Used with chart_type='mostPopular'"),
    max_results: z.number().optional().describe("Default 5"),
};

/** Task 4.4 — dedicated trending videos tool */
const GetTrendingVideosSchema = {
    region_code: z.string().optional().describe("ISO 3166-1 alpha-2 country code (e.g., 'US', 'IN', 'GB'). Defaults to 'US'."),
    category_id: z.string().optional().describe("YouTube video category ID to filter trending videos. Use list_video_categories to discover valid IDs for your region."),
    max_results: z.number().optional().describe("Number of results to return. Default 10, max 50."),
    page_token: z.string().optional().describe("Token from a previous response to fetch the next page of results."),
};

const GetVideoCategoriesSchema = {
    region_code: z.string().describe("e.g., 'US', 'IN'"),
};

const GetVideoCaptionsMetadataSchema = {
    video_id: z.string().describe("The video ID"),
};

/** Tasks 3.13/3.14 — language_code + prefer_manual params */
const DownloadVideoCaptionSchema = {
    video_id: z.string().describe("The ID of the YouTube video to download the transcript for"),
    language_code: z.string().optional().describe("Preferred language code (e.g., 'en', 'es', 'fr', 'ja'). Defaults to English if not specified, then falls back to first available language."),
    prefer_manual: z.boolean().optional().describe("If true (default), prefer manually created captions over auto-generated ones when both are available."),
};

// ── Tool Registrations ─────────────────────────────────────────────────────────

export function registerVideoTools(server: McpServer): void {

    server.registerTool(
        "get_video_metadata",
        {
            description: "Fetch full metadata for one or more YouTube videos by ID, or retrieve the most popular videos chart. Returns snippet (title, description, channelId, tags, publishedAt), contentDetails (duration in ISO 8601, definition, caption), and statistics (viewCount, likeCount, commentCount). Provide comma-separated video_ids for lookup, or chart_type='mostPopular' for trending videos.",
            inputSchema: GetVideoDetailsSchema,
            outputSchema: VideoListOutputSchema,
            annotations: { readOnlyHint: true, openWorldHint: true },
        },
        async (args) => {
            try {
                const params: ApiParams = {
                    part: "snippet,contentDetails,statistics",
                    maxResults: args.max_results ?? 5,
                };
                if (args.video_ids) params.id = args.video_ids;
                if (args.chart_type) params.chart = args.chart_type;
                if (args.category_id) params.videoCategoryId = args.category_id;

                if (!params.id && !params.chart) {
                    return formatError("Must specify either video_ids or chart_type (e.g., 'mostPopular')");
                }
                const data = await ytApiRequest("videos", params);
                return successStructured(data);
            } catch (error) {
                return formatError(error);
            }
        }
    );

    // ── Task 4.4: list_trending_videos ────────────────────────────────────────
    server.registerTool(
        "list_trending_videos",
        {
            description: "Fetch the currently most popular videos on YouTube for a given region and optional category. Returns snippet (title, channelTitle, publishedAt), contentDetails (duration), and statistics (viewCount, likeCount, commentCount) for each video. Use list_video_categories to discover valid category_id values for your region. Use page_token to paginate.",
            inputSchema: GetTrendingVideosSchema,
            outputSchema: VideoListOutputSchema,
            annotations: { readOnlyHint: true, openWorldHint: true },
        },
        async (args) => {
            try {
                const params: ApiParams = {
                    part: "snippet,contentDetails,statistics",
                    chart: "mostPopular",
                    regionCode: args.region_code ?? "US",
                    maxResults: args.max_results ?? 10,
                };
                if (args.category_id) params.videoCategoryId = args.category_id;
                if (args.page_token) params.pageToken = args.page_token;

                const data = await ytApiRequest("videos", params);
                return successStructured(data);
            } catch (error) {
                return formatError(error);
            }
        }
    );

    server.registerTool(
        "list_video_categories",
        {
            description: "List standard YouTube video category names and IDs for a given region (e.g., 'US', 'IN'). Returns items[].id and items[].snippet.title. Use the returned category IDs with search_content or list_trending_videos to filter content by category.",
            inputSchema: GetVideoCategoriesSchema,
            annotations: { readOnlyHint: true, openWorldHint: true, idempotentHint: true },
        },
        async (args) => {
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

    server.registerTool(
        "list_video_captions",
        {
            description: "List available caption track metadata for a video (requires API Key or OAuth). Returns items[].snippet with language (e.g., 'en'), name, trackKind ('standard', 'asr' for auto-generated, 'forced'), and lastUpdated. Use this to discover what caption languages exist for a video; use get_video_transcript to download the actual text.",
            inputSchema: GetVideoCaptionsMetadataSchema,
            annotations: { readOnlyHint: true, openWorldHint: true },
        },
        async (args) => {
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

    server.registerTool(
        "get_video_transcript",
        {
            description: "Download the full spoken transcript of a YouTube video as clean plain text using yt-dlp — no API credentials required. Tries manual English captions first (or specified language_code), then auto-generated, then falls back to the first available language. Returns concatenated plain text plus metadata about which language and caption type was used. Ideal for content research without consuming YouTube API quota.",
            inputSchema: DownloadVideoCaptionSchema,
            annotations: { readOnlyHint: true, openWorldHint: true },
        },
        async (args) => {
            try {
                const output: any = await ytDlp(`https://www.youtube.com/watch?v=${args.video_id}`, {
                    dumpJson: true,
                    skipDownload: true,
                });

                const autoSubs: Record<string, any[]> = output.automatic_captions || {};
                const manualSubs: Record<string, any[]> = output.subtitles || {};

                const preferManual = args.prefer_manual !== false; // default true
                const targetLang = args.language_code ?? 'en';
                const fallbackLangs = ['en', 'en-US', 'en-GB'];

                let resolvedLang: string | null = null;
                let resolvedType: 'manual' | 'auto-generated' | null = null;
                let captionsList: any[] | null = null;

                const candidates: Array<{ lang: string; type: 'manual' | 'auto-generated'; list: any[] }> = [];

                // Build candidate priority list
                const tryLangs = targetLang !== 'en'
                    ? [targetLang, `${targetLang}-US`, ...fallbackLangs]
                    : fallbackLangs;

                for (const lang of tryLangs) {
                    if (preferManual && manualSubs[lang]) {
                        candidates.push({ lang, type: 'manual', list: manualSubs[lang] });
                    }
                    if (autoSubs[lang]) {
                        candidates.push({ lang, type: 'auto-generated', list: autoSubs[lang] });
                    }
                    if (!preferManual && manualSubs[lang]) {
                        candidates.push({ lang, type: 'manual', list: manualSubs[lang] });
                    }
                }

                // Final fallback: first available language
                if (candidates.length === 0) {
                    for (const lang of Object.keys(manualSubs)) {
                        candidates.push({ lang, type: 'manual', list: manualSubs[lang] });
                    }
                    for (const lang of Object.keys(autoSubs)) {
                        candidates.push({ lang, type: 'auto-generated', list: autoSubs[lang] });
                    }
                }

                if (candidates.length === 0) {
                    return formatError("No captions found for this video.");
                }

                const best = candidates[0];
                captionsList = best.list;
                resolvedLang = best.lang;
                resolvedType = best.type;

                // Parse json3 track (preferred — cleanest format)
                const json3Track = captionsList.find((c: any) => c.ext === 'json3');
                let cleanText = '';

                if (json3Track?.url) {
                    const res = await fetch(json3Track.url);
                    const json3 = await res.json() as any;
                    const events: any[] = json3.events || [];

                    const segments: string[] = [];
                    for (const event of events) {
                        if (!event.segs) continue;
                        const text = event.segs
                            .map((seg: any) => seg.utf8 || '')
                            .join('')
                            .trim();
                        if (text && !/^\[.*\]$/.test(text)) {
                            segments.push(text);
                        }
                    }
                    cleanText = segments.join(' ').replace(/[\u266A-\u266F]/g, '').replace(/\s+/g, ' ').trim();
                }

                // Fallback to VTT
                if (!cleanText) {
                    const vttTrack = captionsList.find((c: any) => c.ext === 'vtt') || captionsList[0];
                    if (!vttTrack?.url) return formatError("No valid caption track URL found.");

                    const res = await fetch(vttTrack.url);
                    const vtt = await res.text();

                    const cueBlocks = vtt
                        .replace(/^WEBVTT.*?(\r?\n\r?\n)/s, '')
                        .split(/\n\n+/)
                        .filter((b: string) => b.trim().length > 0);

                    const extractedLines: string[] = [];
                    for (const block of cueBlocks) {
                        const lines = block.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);
                        const textLines = lines.filter((l: string) => !/^\d{2}:\d{2}/.test(l));
                        if (textLines.length === 0) continue;

                        let lastLine = textLines[textLines.length - 1]
                            .replace(/<\d{2}:\d{2}:\d{2}\.\d{3}>/g, '')
                            .replace(/<\/?c>/g, '')
                            .replace(/<[^>]+>/g, '')
                            .trim();

                        if (!lastLine || /^\[.*\]$/.test(lastLine)) continue;
                        if (extractedLines.length > 0 && extractedLines[extractedLines.length - 1] === lastLine) continue;
                        extractedLines.push(lastLine);
                    }

                    cleanText = extractedLines.join(' ').replace(/[\u266A-\u266F]/g, '').replace(/\s+/g, ' ').trim();
                }

                if (!cleanText) {
                    return formatError(`Found a ${resolvedType} caption track in '${resolvedLang}' but it contained no readable text.`);
                }

                // Task 3.14: Prepend source metadata
                const metadata = `[Transcript source: ${resolvedType} captions, language: ${resolvedLang}]\n\n`;
                return success(metadata + cleanText);

            } catch (error) {
                return formatError(`Error fetching transcript via yt-dlp: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
    );
}
