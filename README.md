<div align="center">

# YouTube MCP

**Connect AI assistants to YouTube: search, transcripts, metadata, and more.**

[![npm](https://img.shields.io/npm/v/@mrsknetwork/ytmcp?style=flat-square&color=CB3837&logo=npm&logoColor=white)](https://www.npmjs.com/package/@mrsknetwork/ytmcp)
![Downloads](https://img.shields.io/npm/dw/%40mrsknetwork%2Fytmcp?style=flat)
[![Socket Badge](https://badge.socket.dev/npm/package/@mrsknetwork/ytmcp/1.0.10)](https://badge.socket.dev/npm/package/@mrsknetwork/ytmcp/1.0.10)
[![MIT](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](https://opensource.org/licenses/MIT)
[![MCP](https://img.shields.io/badge/MCP-Compatible-6366F1?style=flat-square)](https://modelcontextprotocol.io)

</div>

---

## What can it do?

Once connected, your AI can:

- Extract clean, word-for-word video transcripts. No credentials required.
- Search YouTube by keyword, date range, duration, quality, and region.
- Fetch trending videos for any country and category.
- Retrieve video stats, metadata, comments, captions, and channel details.
- Look up channels by `@handle` (e.g. `@MrBeast`).
- Access your own subscriptions, members, and membership tiers via OAuth.

---

## Getting Started

The server supports three access tiers. Pick the one that fits your use case.

### Guest Mode (No Setup)

Works out of the box. The `get_video_transcript` tool uses `yt-dlp` to extract transcripts without any API credentials.

```json
{
  "mcpServers": {
    "youtube-mcp": {
      "command": "npx",
      "args": ["-y", "@mrsknetwork/ytmcp@latest"]
    }
  }
}
```

---

### API Key (Recommended)

Unlocks all public data tools. Best for search, metadata, comments, trending videos, and transcripts.

**1. Get a Google API Key**

1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Enable **YouTube Data API v3** for your project.
3. Go to **Credentials** and create an **API Key**.

**2. Add to your MCP client config**

```json
{
  "mcpServers": {
    "youtube-mcp": {
      "command": "npx",
      "args": ["-y", "@mrsknetwork/ytmcp@latest", "YOUR_GOOGLE_API_KEY"]
    }
  }
}
```

---

### OAuth 2.0

<details>
<summary><b>Required for private subscriptions, memberships, and account activity.</b></summary>

<br/>

**1. Create an OAuth 2.0 Client**

1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Enable **YouTube Data API v3** for your project.
3. Go to **Credentials > Create Credentials > OAuth 2.0 Client ID**.
4. Set Application type to **Web application**.
5. Add this exact Redirect URI: `http://localhost:31415/oauth2callback`.
6. Go to **OAuth Consent Screen > Test Users** and add your Gmail address.

**2. Add to your MCP client config**

Credentials are passed securely via environment variables in the MCP config. They are never stored in files.

```json
{
  "mcpServers": {
    "youtube-mcp": {
      "command": "npx",
      "args": ["-y", "@mrsknetwork/ytmcp@latest"],
      "env": {
        "GOOGLE_CLIENT_ID": "your-client-id.apps.googleusercontent.com",
        "GOOGLE_CLIENT_SECRET": "your-client-secret"
      }
    }
  }
}
```

**3. First-time login**

On your first tool call, the AI will share a login link. Click it, authorize the app in your browser, then tell the AI you are done. Your session is saved. You will not need to log in again unless you revoke access.

**4. Signing out**

Ask your AI to call `revoke_oauth_token` to sign out and delete your stored credentials at any time.

</details>

---

## Available Tools

| Tool | Auth | Description |
|------|------|-------------|
| `get_video_transcript` | None | Download a full spoken transcript using yt-dlp. Specify `language_code` (e.g. `en`, `es`) and whether to prefer manual or auto-generated captions. Returns source metadata with the text. |
| `search_content` | API Key | Search YouTube for videos, channels, or playlists. Filter by `order`, `published_after`, `published_before`, `video_duration`, `video_definition`, and `region_code`. Supports pagination. |
| `get_video_metadata` | API Key | Fetch title, description, tags, duration, and stats (views, likes, comments) for one or more videos by ID. |
| `get_channel_metadata` | API Key | Fetch channel profile, subscriber count, video count, and uploads playlist ID. Accepts a channel ID or `@handle`. |
| `list_trending_videos` | API Key | Fetch the most popular videos on YouTube for a given `region_code` and optional `category_id`. Supports pagination. |
| `list_playlists` | API Key | List playlists for a channel, or fetch specific playlists by ID. Returns title, description, and item count. |
| `list_playlist_items` | API Key | List all videos inside a playlist in order. Returns title, position, and video ID for each entry. |
| `list_video_comments` | API Key | Fetch top-level comment threads for a video or channel. Filter by keyword with `search_terms`. Supports pagination. |
| `list_comment_replies` | API Key | Fetch replies to a specific comment thread by `parent_comment_id`. Supports pagination. |
| `list_video_captions` | API Key | List available caption tracks for a video, including language code and type (manual or auto-generated). |
| `list_video_categories` | API Key | List YouTube video category names and IDs for a given region. Use the IDs with `search_content` or `list_trending_videos`. |
| `list_channel_activities` | API Key | Fetch a channel's recent activity feed, including uploads and playlist additions. |
| `list_channel_sections` | API Key | List the shelf sections displayed on a channel's page, in order. |
| `list_supported_languages` | API Key | List all languages supported by YouTube, with language codes and localized names. |
| `list_supported_regions` | API Key | List all regions supported by YouTube, with region codes and names. |
| `list_subscriptions` | API Key / OAuth | List public subscriptions for a channel by `channel_id` (API Key), or your own subscriptions with `mine=true` (OAuth). |
| `list_channel_members` | OAuth | List current paying members of your channel. Requires an active memberships program. |
| `list_membership_levels` | OAuth | List the membership tier names and levels configured for your channel. |
| `revoke_oauth_token` | OAuth | Sign out and permanently delete your stored Google credentials from the server. |


---

## Building from Source

<details>
<summary><b>Instructions for running the server locally.</b></summary>

<br/>

```bash
git clone https://github.com/mrsknetwork/ytmcp.git
cd ytmcp
npm install
npm run build
node build/server/index.js "YOUR_API_KEY"
```

</details>

---

## License

Licensed under the [MIT License](LICENSE).
