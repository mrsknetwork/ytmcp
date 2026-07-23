# YouTube MCP Server - LLM Usage Instructions

This document provides comprehensive guidance for AI assistants (LLMs) on how to discover, configure, and effectively use the YouTube Model Context Protocol (MCP) server (`@mrsknetwork/ytmcp`).

---

## Overview & Capabilities

The **YouTube MCP Server** connects AI models to YouTube's ecosystem to perform search, transcript extraction, channel and playlist analysis, comment retrieval, and authenticated user operations.

### Key Capabilities:
- **Clean Video Transcripts**: Extract word-for-word transcripts with source metadata using local `yt-dlp` binary execution (zero API quota consumption).
- **Advanced Search**: Search videos, playlists, or channels with date, duration, order, definition, and region filters.
- **Video & Channel Analytics**: Fetch view counts, like counts, comment counts, subscriber statistics, channel sections, and recent activity feeds.
- **Comment Analysis**: Retrieve top-level comment threads and replies with keyword filtering.
- **OAuth User Features**: Access private subscriptions, channel membership tiers, and paying member lists.

---

## Authentication Tiers & Feature Matrix

The server automatically adjusts available tools based on the configured authentication tier:

| Tier | Required Environment Variable(s) | Available Tools | Quota Impact |
| :--- | :--- | :--- | :--- |
| **Guest Mode** | None | `get_video_transcript` | 0 YouTube API Quota |
| **API Key Mode** | `GOOGLE_API_KEY` | All public tools (`search_content`, `get_video_metadata`, `get_channel_metadata`, `list_trending_videos`, etc.) | Standard YouTube API v3 Quota |
| **OAuth 2.0 Mode** | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | All public tools + `list_subscriptions` (mine), `list_channel_members`, `list_membership_levels`, `revoke_oauth_token` | User-scoped API Quota |

> [!NOTE]
> Environment variables can be provided in a `.env` file in the working directory or passed via the `env` object in your MCP client configuration (`claude_desktop_config.json`, Antigravity settings, etc.).

---

## Complete Tool Reference

### 1. Transcript & Caption Tools

#### `get_video_transcript`
- **Auth**: None (Guest Mode compatible). Uses `bin/yt-dlp`.
- **Purpose**: Download spoken transcript text of a YouTube video as clean plain text without consuming YouTube API quota.
- **Input Parameters**:
  - `video_id` (string, required): 11-character YouTube video ID (e.g., `dQw4w9WgXcQ`).
  - `language_code` (string, optional): Preferred ISO language code (e.g., `en`, `es`, `fr`). Default: `en`.
  - `prefer_manual` (boolean, optional): Whether to prefer human-created captions over auto-generated ones. Default: `true`.
  - `start_minutes` (number, optional): Start timestamp in minutes for range extraction.
  - `end_minutes` (number, optional): End timestamp in minutes for range extraction.
  - `max_characters` (number, optional): Max response character limit (default `100000`, set `0` for unlimited).
  - `user_agent` (string, optional): Custom User-Agent string to bypass bot detection or rate limits. Defaults to `YT_DLP_USER_AGENT` env variable or a standard modern browser User-Agent.
- **LLM Strategy**: Use this first when researching video content, summarizing lectures, or extracting specific quotes.

#### `list_video_captions`
- **Auth**: API Key or OAuth.
- **Purpose**: List available caption tracks for a video with language codes and track kinds (`standard`, `asr` for auto-generated, `forced`).

---

### 2. Search & Discovery Tools

#### `search_content`
- **Auth**: API Key or OAuth.
- **Purpose**: Search YouTube for videos, channels, or playlists.
- **Input Parameters**:
  - `query` (string, optional): Free-text search terms.
  - `content_type` (string, optional): `'video'`, `'channel'`, or `'playlist'`.
  - `order` (string, optional): `'relevance'`, `'date'`, `'viewCount'`, `'rating'`, `'title'`.
  - `published_after` (string, optional): ISO 8601 UTC date string (e.g., `2024-01-01T00:00:00Z`).
  - `published_before` (string, optional): ISO 8601 UTC date string.
  - `video_duration` (string, optional): `'any'`, `'short'` (<4m), `'medium'` (4-20m), `'long'` (>20m).
  - `video_definition` (string, optional): `'any'`, `'high'`, `'standard'`.
  - `region_code` (string, optional): 2-letter ISO country code (e.g., `US`, `GB`).
  - `page_token` (string, optional): Pagination token.
  - `max_results` (number, optional): Default 5, max 50.

#### `list_trending_videos`
- **Auth**: API Key or OAuth.
- **Purpose**: Fetch top trending videos for a region and optional category.
- **Input Parameters**: `region_code` (default `'US'`), `category_id` (optional string), `max_results` (optional number), `page_token` (optional string).

---

### 3. Video & Channel Metadata Tools

#### `get_video_metadata`
- **Auth**: API Key or OAuth.
- **Purpose**: Retrieve detailed snippet, contentDetails (duration, definition), and statistics (views, likes, comments) for one or more video IDs.
- **Input Parameters**: `video_ids` (comma-separated string), `chart_type` (optional string), `max_results` (optional number).

#### `get_channel_metadata`
- **Auth**: API Key or OAuth.
- **Purpose**: Retrieve channel profile, subscriber count, total video count, view count, and `uploadsPlaylistId`.
- **Input Parameters**: `channel_id` (string, optional), `handle` (string, optional e.g. `@mkbhd`). Must specify one.

#### `list_channel_activities`
- **Auth**: API Key or OAuth.
- **Purpose**: Fetch recent activity feed (uploads, recommendations, playlist items) for a channel.

#### `list_channel_sections`
- **Auth**: API Key or OAuth.
- **Purpose**: Retrieve ordered shelf sections displayed on a channel's homepage.

---

### 4. Playlist Tools

#### `list_playlists`
- **Auth**: API Key or OAuth.
- **Purpose**: List playlists for a channel or by specific playlist IDs.

#### `list_playlist_items`
- **Auth**: API Key or OAuth.
- **Purpose**: Fetch all video items in a playlist in ordered order with pagination support.

---

### 5. Comment Tools

#### `list_video_comments`
- **Auth**: API Key or OAuth.
- **Purpose**: Fetch top-level comment threads for a video or channel with optional search filter.

#### `list_comment_replies`
- **Auth**: API Key or OAuth.
- **Purpose**: Fetch replies to a specific parent comment.

---

### 6. OAuth & User Tools

#### `list_subscriptions`
- **Auth**: API Key (for public channel ID lookup) or OAuth (for `mine=true`).
- **Purpose**: List public subscriptions of a channel or current logged-in user's subscriptions.

#### `list_channel_members` & `list_membership_levels`
- **Auth**: OAuth only.
- **Purpose**: Retrieve paying channel members and membership tiers.

#### `revoke_oauth_token`
- **Auth**: OAuth only.
- **Purpose**: Sign out and delete stored access tokens.

---

### 7. Helper & i18n Tools

#### `list_video_categories`, `list_supported_languages`, `list_supported_regions`
- **Auth**: API Key or OAuth.
- **Purpose**: Discover category IDs, supported ISO language codes, and country region codes.

---

## Multi-Step Agent Workflows

### Workflow 1: Deep Video Content Research
1. Call `search_content` (e.g. `query="Quantum Computing Explained"`, `order="viewCount"`, `video_duration="long"`).
2. Inspect results and select target `video_id`.
3. Call `get_video_transcript(video_id=...)` to download full clean transcript.
4. If transcript text is long, use `start_minutes` and `end_minutes` to zoom into specific sections.

### Workflow 2: Channel Upload History & Oldest Video Extraction
1. Call `get_channel_metadata(handle="@mkbhd")`.
2. Extract `contentDetails.relatedPlaylists.uploads`.
3. Call `list_playlist_items(playlist_id=uploadsPlaylistId, max_results=50)`.
4. Follow `nextPageToken` iteratively to reach the earliest uploaded video.
5. Retrieve video details using `get_video_metadata`.

### Workflow 3: Trending Topic & Audience Sentiment Analysis
1. Call `list_video_categories(region_code="US")` to identify category ID for Tech/Music/News.
2. Call `list_trending_videos(region_code="US", category_id=...)`.
3. For top trending video, call `list_video_comments(video_id=...)` to analyze viewer reactions and feedback.

---

## Error Handling & Diagnostics

- **Guest Mode Limitations**: If an API Key or OAuth is missing and a non-transcript tool is called, the server returns an error: *"This tool requires a Google API Key or OAuth credentials."* Prompt the user to add `GOOGLE_API_KEY` to their `.env` file or MCP client config.
- **Quota Exceeded (`quotaExceeded`)**: Daily API quota limit reached. Recommend using `get_video_transcript` (uses zero quota) or switching API keys.
- **Invalid Key (`keyInvalid`)**: Verify `GOOGLE_API_KEY` value in `.env`.
- **OAuth Authentication Required**: The server provides a direct authorization URL for browser-based login.
