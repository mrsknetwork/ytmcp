import { authorize } from "./auth.js";
import { z } from "zod";

// ----------------------------------------------------------------------
// Auth State (singleton per process)
// ----------------------------------------------------------------------

let authPromise: Promise<any> | null = null;
let currentAuthType: string | null = null;
let currentCredentials: any = null;

export async function getCredentials(apiKey?: string) {
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

export async function ensureApiAccess() {
    const creds = await getCredentials(process.argv[2]);
    if (currentAuthType === 'guest') {
        throw new Error("This tool requires a Google API Key or OAuth credentials. In Guest Mode, only the 'get_video_transcript' tool is available.");
    }
    return creds;
}

export async function ensureOAuthAccess() {
    const creds = await getCredentials(process.argv[2]);
    if (currentAuthType !== 'oauth') {
        throw new Error("This tool requires OAuth authentication. Please configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your MCP client config.");
    }
    return creds;
}

// ----------------------------------------------------------------------
// YouTube API Error Reason Map (task 3.12)
// ----------------------------------------------------------------------

const ERROR_REASON_MAP: Record<string, string> = {
    quotaExceeded: "Daily API quota exceeded. Try again after midnight Pacific Time, or use a different API key.",
    rateLimitExceeded: "Rate limit exceeded. Please wait a moment before retrying.",
    keyInvalid: "The provided API key is invalid. Please verify your GOOGLE_API_KEY value.",
    keyExpired: "The provided API key has expired. Generate a new key in Google Cloud Console.",
    forbidden: "Access forbidden. This content may be private, restricted, or require OAuth.",
    insufficientPermissions: "Insufficient OAuth scope for this operation. Re-authenticate to grant the required permissions.",
    videoNotFound: "Video not found. Verify the video ID is correct and the video is publicly accessible.",
    channelNotFound: "Channel not found. Check the channel ID or handle is correct.",
    playlistNotFound: "Playlist not found. Verify the playlist ID and that it is publicly accessible.",
    commentNotFound: "Comment not found. The comment may have been deleted.",
    commentsDisabled: "Comments are disabled for this video.",
    processingFailure: "YouTube is still processing this video. Try again in a few minutes.",
    invalidPart: "Invalid 'part' parameter. Check the API documentation for valid part values.",
    invalidVideoId: "The provided video ID is malformed. YouTube video IDs are 11 characters.",
    resourceAlreadyExists: "This resource already exists.",
    accountClosed: "The YouTube account associated with this request has been closed.",
    accountSuspended: "The YouTube account associated with this request has been suspended.",
};

function parseYouTubeError(status: number, statusText: string, body: string): string {
    try {
        const parsed = JSON.parse(body);
        const apiError = parsed?.error;
        if (!apiError) return `YouTube API Error: ${status} ${statusText} - ${body}`;

        const reason: string = apiError?.errors?.[0]?.reason ?? '';
        const apiMessage: string = apiError?.message ?? statusText;
        const friendly = ERROR_REASON_MAP[reason];

        if (friendly) {
            return `YouTube API Error (${reason}): ${friendly}`;
        }
        return `YouTube API Error ${status}: ${apiMessage}${reason ? ` [${reason}]` : ''}`;
    } catch {
        return `YouTube API Error: ${status} ${statusText} - ${body}`;
    }
}

// ----------------------------------------------------------------------
// API Client
// ----------------------------------------------------------------------

export type ApiParams = Record<string, string | number | boolean | undefined | string[]>;

/** Exponential backoff sleep helper */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/** Task 4.7: Retry on 429 / 503 with exponential backoff. Bail immediately on quotaExceeded (403). */
export async function ytApiRequest(endpoint: string, params: ApiParams, attempt = 1): Promise<any> {
    const creds = await ensureApiAccess();

    const url = new URL(`https://youtube.googleapis.com/youtube/v3/${endpoint}`);

    // Add default 'part' for endpoints that need it
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

    const headers: Record<string, string> = { 'Accept': 'application/json' };

    if (creds.type === 'oauth') {
        const token = await creds.client.getAccessToken();
        headers['Authorization'] = `Bearer ${token.token}`;
    }

    const res = await fetch(url.toString(), { headers });

    if (!res.ok) {
        const errBody = await res.text();
        const errMessage = parseYouTubeError(res.status, res.statusText, errBody);

        // Bail immediately on quota exceeded — retrying will not help
        if (res.status === 403 && errBody.includes('quotaExceeded')) {
            throw new Error(errMessage);
        }

        // Retry with exponential backoff for transient errors
        if ((res.status === 429 || res.status === 503) && attempt <= 3) {
            const backoffMs = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
            console.error(`YouTube API ${res.status} — retrying in ${backoffMs / 1000}s (attempt ${attempt}/3)...`);
            await sleep(backoffMs);
            return ytApiRequest(endpoint, params, attempt + 1);
        }

        throw new Error(errMessage);
    }

    return res.json();
}

// ----------------------------------------------------------------------
// Response Helpers
// ----------------------------------------------------------------------

export function success(data: unknown) {
    return {
        content: [{ type: "text" as const, text: typeof data === 'string' ? data : JSON.stringify(data, null, 2) }]
    };
}

/** Returns text content AND structuredContent for tools that declare an outputSchema. */
export function successStructured(data: unknown) {
    return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
        structuredContent: data as Record<string, unknown>,
    };
}

export function formatError(error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
        content: [{ type: "text" as const, text: `Error: ${message}` }],
        isError: true
    };
}

// ----------------------------------------------------------------------
// Output Schemas
// ----------------------------------------------------------------------

const PageInfoSchema = z.object({
    totalResults: z.number(),
    resultsPerPage: z.number(),
});

export const VideoListOutputSchema = z.object({
    kind: z.string(),
    nextPageToken: z.string().optional(),
    pageInfo: PageInfoSchema.optional(),
    items: z.array(z.object({
        kind: z.string(),
        id: z.string(),
        snippet: z.record(z.string(), z.any()).optional(),
        contentDetails: z.record(z.string(), z.any()).optional(),
        statistics: z.object({
            viewCount: z.string().optional(),
            likeCount: z.string().optional(),
            favoriteCount: z.string().optional(),
            commentCount: z.string().optional(),
        }).optional(),
    })),
});

export const ChannelListOutputSchema = z.object({
    kind: z.string(),
    nextPageToken: z.string().optional(),
    pageInfo: PageInfoSchema.optional(),
    items: z.array(z.object({
        kind: z.string(),
        id: z.string(),
        snippet: z.record(z.string(), z.any()).optional(),
        statistics: z.object({
            viewCount: z.string().optional(),
            subscriberCount: z.string().optional(),
            hiddenSubscriberCount: z.boolean().optional(),
            videoCount: z.string().optional(),
        }).optional(),
        contentDetails: z.record(z.string(), z.any()).optional(),
    })),
});

export const PlaylistListOutputSchema = z.object({
    kind: z.string(),
    nextPageToken: z.string().optional(),
    pageInfo: PageInfoSchema.optional(),
    items: z.array(z.object({
        kind: z.string(),
        id: z.string(),
        snippet: z.record(z.string(), z.any()).optional(),
        contentDetails: z.object({
            itemCount: z.number().optional(),
        }).optional(),
    })),
});
