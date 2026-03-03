# YouTube MCP (@mrsknetwork/ytmcp)

[![npm version](https://img.shields.io/npm/v/@mrsknetwork/ytmcp.svg)](https://www.npmjs.com/package/@mrsknetwork/ytmcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

A Model Context Protocol (MCP) server that provides AI assistants (including Claude Desktop, Cursor, VS Code, and Antigravity) with tools for interacting with public and private YouTube data.

This server interfaces securely with the official YouTube Data API v3 and supports a tiered authentication system for maximum flexibility and reliability.

## Features and Capabilities

* **Tiered Authentication System:**
  * **API Key Mode:** Instantly access public data using a provisioned API key.
  * **OAuth2 Mode:** Access private user data (subscriptions, memberships, playlists) with automatic token refresh and incremental authorization.
  * **Guest Mode:** The server remains operational without credentials. Scraper-dependent tools, such as `download_video_caption`, function via `yt-dlp` extraction methods.
* **Security:** Implements protected OAuth callbacks, automated server timeouts, and a built-in `revoke_authentication` tool for secure session termination.
* **Transcripts:** Extracts clean-text video transcripts directly, bypassing API restrictions via `yt-dlp` integration.

## Installation and Quick Start

The recommended initialization method utilizes an existing YouTube Data API Key. This provides access to all public data endpoints (Search, Details, Captions).

Add the following configuration to your MCP client:

```json
{
  "mcpServers": {
    "youtube-mcp": {
      "command": "npx",
      "args": [
        "-y",
        "@mrsknetwork/ytmcp@latest",
        "YOUR_GOOGLE_API_KEY"
      ]
    }
  }
}
```

## Advanced Configuration: OAuth 2.0

Accessing private data requires OAuth 2.0 configuration.

### 1. Acquire Credentials
1. Navigate to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project and enable the **YouTube Data API v3**.
3. Navigate to **APIs & Services > Credentials**.
4. Create an **OAuth 2.0 Client ID** (Application type: "Web application").
5. Specify the Authorized Redirect URI: `http://localhost:3000/oauth2callback`.

### 2. Client Configuration
Define the credentials within your client's environment variables. The server will detect these variables, prioritize them over the positional API Key argument, and initiate the OAuth2 authorization flow upon the first tool execution.

```json
{
  "mcpServers": {
    "youtube-mcp": {
      "command": "npx",
      "args": ["-y", "@mrsknetwork/ytmcp@latest"],
      "env": {
        "GOOGLE_CLIENT_ID": "your-google-oauth-client-id",
        "GOOGLE_CLIENT_SECRET": "your-google-oauth-client-secret"
      }
    }
  }
}
```

*Note: The initial OAuth tool invocation will generate a secure URL requiring explicit browser authorization.*

## Available Tools Reference

| Tool Name | Description | Requires Authentication |
|-----------|-------------|-------------------------|
| `download_video_caption` | Extracts clear-text video transcripts via `yt-dlp`. | No (Guest Mode Supported) |
| `search_youtube_content` | Performs queries for videos, channels, and playlists. | API Key or OAuth |
| `get_video_details` | Retrieves video statistics, descriptions, and metadata. | API Key or OAuth |
| `get_channel_details` | Retrieves channel subscriber metrics and profiles. | API Key or OAuth |
| `get_playlists` | Retrieves user or channel playlists. | API Key or OAuth |
| `get_playlist_items` | Retrieves the video index within a specified playlist. | API Key or OAuth |
| `get_comment_threads` | Retrieves top-level comment threads for a video. | API Key or OAuth |
| `get_comments_replies` | Retrieves specific reply threads to top-level comments. | API Key or OAuth |
| `get_subscriptions_list` | Retrieves subscription data. | **OAuth Only** |
| `get_memberships_levels` | Retrieves membership pricing tiers for a channel. | **OAuth Only** |
| `revoke_authentication` | Terminates the active session and deletes stored tokens. | **OAuth Only** |

## Source Installation and Development

To compile and execute the server directly from source:

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/mrsknetwork/youtube-mcp.git
   cd youtube-mcp
   npm install
   ```
2. **Compile the TypeScript Source:**
   ```bash
   npm run build
   ```
3. **Execute the Server:**
   ```bash
   npx ts-node src/server/index.ts "YOUR_API_KEY"
   ```

## Windows Installation Troubleshooting

When executing global installations (`npm i -g @mrsknetwork/ytmcp`) on Windows architectures, the following mitigations apply to common errors:

1. **File Locking Constraints (`EPERM`):** Ensure all consuming agents (e.g., Claude Desktop) are completely exited before executing an upgrade. Active server instances will lock dependency files.
2. **Post-Installation Hooks (`bin-version-check`):** If the `yt-dlp-exec` Python verification framework fails, bypass the check utilizing environment variables:
   ```powershell
   $env:YTDLP_SKIP_PYTHON_CHECK="true"; npm i -g @mrsknetwork/ytmcp
   ```
3. **Privilege Escalation:** Execute the installation terminal instance with Administrator privileges to ensure correct global path resolution.

## License

Licensed under the [MIT License](LICENSE).
