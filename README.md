# YouTube MCP (@mrsknetwork/ytmcp)

A Model Context Protocol (MCP) server that provides tools for safely interacting with public YouTube data via the official YouTube Data API v3 and OAuth 2.0.

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

To install and use this MCP server with Claude Desktop, Cursor, or Antigravity, add it to your MCP server configuration:

```json
{
  "mcpServers": {
    "youtube-mcp": {
      "command": "npx",
      "args": ["-y", "@mrsknetwork/ytmcp"]
    }
  }
}
```

### Local Development

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

## 3. Usage with Docker

> [!IMPORTANT]
> **Security Notice**: The provided `Dockerfile` and `.dockerignore` are configured to **exclude** your personal `.env` and `tokens.json` files. This ensures your credentials are never baked into the image. You must provide them as environment variables at runtime.

The YouTube MCP server is fully compatible with the **Docker MCP Toolkit** and the **Official Docker MCP Registry**.

### Build the Image
```bash
docker build -t ytmcp .
```

### Docker MCP Registry Configuration
If you wish to submit this server to the [Official Docker MCP Registry](https://github.com/docker/mcp-registry), use the following `server.yaml` configuration:

```yaml
name: ytmcp
image: mcp/ytmcp
type: server
meta:
  category: multimedia
  tags:
    - youtube
    - search
    - transcript
about:
  title: YouTube MCP
  icon: https://www.google.com/s2/favicons?domain=youtube.com&sz=64
source:
  project: https://github.com/mrsknetwork/youtube-mcp
  # commit: <latest-commit-hash>
run:
  env:
    GOOGLE_CLIENT_ID: $GOOGLE_CLIENT_ID
    GOOGLE_CLIENT_SECRET: $GOOGLE_CLIENT_SECRET
    GOOGLE_REDIRECT_URI: http://localhost:3000/oauth2callback
config:
  secrets:
    - name: google.client_id
      env: GOOGLE_CLIENT_ID
    - name: google.client_secret
      env: GOOGLE_CLIENT_SECRET
```

### Docker MCP Toolkit Integration (Local)
1. Open **Docker Desktop** and go to the **MCP Toolkit** dashboard.
2. Click **Add Server** > **Image**.
3. Use the image `ytmcp` you built locally.
4. Set the environment variables in the dashboard.
5. Ensure a volume is mounted to persist `tokens.json`: `-v ${PWD}/tokens.json:/app/tokens.json`.

## 4. First-time Authentication

When you run the server for the first time, it will automatically open a Google Login page in your default browser.
Authorize the application. Upon success, a `tokens.json` file will be generated locally so you don't continually need to authenticate.

*Note: The authorization server spins up a small local express app strictly on `127.0.0.1:3000` to capture the callback securely.*

## License

ISC
