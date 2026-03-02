# YouTube MCP (@mrsknetwork/ytmcp)

A Model Context Protocol (MCP) server that provides tools for safely interacting with public YouTube data via the official YouTube Data API v3 and OAuth 2.0.

## Features

- **Privacy-First:** Strictly exposes only public YouTube data endpoints. Verified against AI ethics guidelines to prevent unauthorized extraction of private user context.
- **Robust Transcripts:** Includes `yt-dlp` integration to bypass common API 403 errors and reliably extract video captions/transcripts.
- **Secure Architecture:** Tokens are requested via a temporary localhost Express Server, requiring no manual copy-pasting, and are securely cached using OS file permissions.
- **Zero Configuration Run:** After initial `.env` setup, run globally from any terminal.

## Available Tools

The following tools are exposed to any compatible MCP client (like Claude Desktop, Cursor, or Supernova):

| Tool Name | Description |
|-----------|-------------|
| `search_youtube_content` | Search public videos, channels, and playlists. |
| `get_video_details` | View video statistics, descriptions, and metadata. |
| `download_video_caption` | Download and automatically parse clear-text transcripts via `yt-dlp`. |
| `get_channel_details` | Inspect public channel subscriber counts and profiles. |
| `get_playlists` | Get public user playlists. |
| `get_playlist_items` | Look up videos inside a playlist. |
| `get_comment_threads` | Fetch top-level comment threads for a video. |
| `get_comments_replies` | Fetch specific comment replies. |
| `get_video_captions_metadata` | Fetch available caption track metadata for a video. |
| `get_video_categories` | Get localized video categories. |
| `get_supported_languages` / `Regions`| Check YouTube localization support. |

*(Tool capabilities matching YouTube Data API `GET` resources)*

### 📝 Transcript Output Example (`download_video_caption`)
Our `yt-dlp` integration includes a built-in Regex WebVTT parser. It strips all HTML tags, `-->` timestamps, and `align:` metadata, while automatically filtering out overlapping duplicate AI-caption lines, delivering **pure LLM-ready text content**:

```text
Today I'm going to be showing you guys five simple hacks that you can use to make sure that Cloud Code is building you websites that don't look like they were AI vibe coded, but they actually feel professional and branded. And we're going to be going through this in a way where even if you've never used Cloud Code before, that's completely fine.
```

## 1. Setup Environment Variables

Create a `.env` file in the root directory where you are running the server.

```env
GOOGLE_CLIENT_ID="your-google-oauth-client-id"
GOOGLE_CLIENT_SECRET="your-google-oauth-client-secret"
```

### Acquiring Credentials
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create or select a project.
3. Enable the **YouTube Data API v3**.
4. Navigate to **APIs & Services > Credentials**.
5. Create an **OAuth 2.0 Client ID** (Application type: "Web application", Authorized redirect URIs: `http://localhost:3000/oauth2callback`).

## 2. Installation and Usage

### Option A: Run via NPM (Recommended)

You can run the server seamlessly using `npx`:

```bash
npx -y @mrsknetwork/ytmcp
```

### Option B: Local Development

1. **Clone and Install:**
   ```bash
   git clone https://github.com/mrsknetwork/youtube-mcp.git
   cd youtube-mcp
   npm install
   ```
2. **Build:**
   ```bash
   npm run build
   ```
3. **Start the Server:**
   ```bash
   npm start
   ```

## 3. First-time Authentication

When you run the server for the first time, it will automatically open a Google Login page in your default browser.
Authorize the application. Upon success, a `tokens.json` file will be generated locally so you don't continually need to authenticate.

*Note: The authorization server spins up a small local express app strictly on `127.0.0.1:3000` to capture the callback securely.*

## FAQ: OAuth 2.0 vs API Keys

**Why does this package use OAuth 2.0 instead of a simpler API Key?**

- **API Keys** are lightweight and perfect for accessing purely *public* data (like searching videos or reading comments). They don't require user consent screens.
- **OAuth 2.0** is required for accessing *private* user data or interacting on a user's behalf. Since this MCP server includes tools like `get_subscriptions_list(mine: true)` and `get_memberships_levels`, OAuth 2.0 is mandatory to authorize those specific scopes securely.

## License

ISC
