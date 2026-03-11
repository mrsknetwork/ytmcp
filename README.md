<div align="center">

# YouTube MCP

**Connect AI assistants to YouTube - search, transcripts, metadata, and more.**

[![npm](https://img.shields.io/npm/v/@mrsknetwork/ytmcp?style=flat-square&color=CB3837&logo=npm&logoColor=white)](https://www.npmjs.com/package/@mrsknetwork/ytmcp)
[![MIT](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](https://opensource.org/licenses/MIT)
[![MCP](https://img.shields.io/badge/MCP-Compatible-6366F1?style=flat-square)](https://modelcontextprotocol.io)
[![Socket Badge](https://badge.socket.dev/npm/package/@mrsknetwork/ytmcp/1.0.9)](https://badge.socket.dev/npm/package/@mrsknetwork/ytmcp/1.0.9)

</div>

---

## What can it do?

Once connected, your AI can:

- Extract clean, word-for-word video transcripts - **no credentials required**.
- Search YouTube for videos, channels, and playlists.
- Retrieve video stats, metadata, comments, and captions.
- Access private data like subscriptions and memberships (with OAuth).

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

Unlocks all public data tools. Best for search, metadata, comments, and transcripts.

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

On your first tool call, the AI will share a login link. Click it, authorize the app in your browser, then tell the AI you are done. Your session is saved - you won't need to log in again unless you revoke access.

</details>

---

## Available Tools

| Tool | Auth Required | Description |
|------|--------------|-------------|
| `get_video_transcript` | None | Extract a full video transcript via `yt-dlp`. |
| `search_content` | API Key / OAuth | Search for videos, channels, or playlists. |
| `get_video_metadata` | API Key / OAuth | Fetch metadata and stats for specific videos. |
| `get_channel_metadata` | API Key / OAuth | Fetch channel profile and subscriber info. |
| `list_playlists` | API Key / OAuth | Retrieve playlists for a channel. |
| `list_playlist_items` | API Key / OAuth | List videos inside a playlist. |
| `list_video_comments` | API Key / OAuth | Get top-level comments for a video or channel. |
| `list_comment_replies` | API Key / OAuth | Get replies to a specific comment. |
| `list_video_captions` | API Key / OAuth | List available caption tracks for a video. |
| `list_video_categories` | API Key / OAuth | List YouTube video categories by region. |
| `list_supported_languages` | API Key / OAuth | List languages supported by YouTube. |
| `list_supported_regions` | API Key / OAuth | List regions supported by YouTube. |
| `list_channel_activities` | API Key / OAuth | Get recent activity for a channel. |
| `list_channel_sections` | API Key / OAuth | Get the sections on a channel page. |
| `list_subscriptions` | OAuth only | List subscriptions for a channel or your account. |
| `list_channel_members` | OAuth only | List members of your channel. |
| `list_membership_levels` | OAuth only | List membership tiers for your channel. |

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
