# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Version numbers follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.9] - 2026-04-20

### Added

- **`list_trending_videos`** - new dedicated tool for fetching the most popular videos on YouTube for a given country and category. More ergonomic than the previous `get_video_metadata(chart_type="mostPopular")` pattern.
- **`revoke_oauth_token`** - new tool that lets users sign out of their Google account and delete stored OAuth credentials without leaving their AI assistant.
- **`search_content` filters** - six new optional parameters for precision search:
  - `order` - sort by `relevance`, `date`, `viewCount`, `rating`, `title`, or `videoCount`
  - `published_after` / `published_before` - filter by RFC 3339 date range
  - `video_duration` - filter by `short` (<4 min), `medium` (4-20 min), or `long` (>20 min)
  - `video_definition` - filter by `hd` or `standard` quality
  - `region_code` - geo-restrict results to a country (e.g. `'US'`, `'IN'`)
- **`get_video_transcript` language support** - two new optional parameters:
  - `language_code` - request a transcript in a specific language (e.g. `'es'`, `'ja'`)
  - `prefer_manual` - choose between manually created captions and auto-generated ones (defaults to manual)
  - The response now includes a header indicating which language and caption type was used.
- **`page_token` pagination** - all list-based tools (`search_content`, `list_playlists`, `list_playlist_items`, `list_video_comments`, `list_comment_replies`, `list_channel_activities`, `list_subscriptions`) now accept a `page_token` parameter to retrieve additional pages of results.
- **`eval.xml`** - a 10-question evaluation suite for testing the server's effectiveness with AI agents. Covers multi-hop workflows: channel lookup, date-filtered search, transcript extraction, comment analysis, trending, pagination, and more.

### Changed

- **`get_channel_metadata`** now accepts a `handle` parameter (e.g. `'@MrBeast'` or `'MrBeast'`) in addition to channel IDs, using the current YouTube API `forHandle` field.
- **`list_subscriptions`** - the tool no longer incorrectly requires OAuth for public channel subscriptions. An API key is sufficient when querying a public `channel_id`; OAuth is only required for `mine=true`.
- **Tool descriptions** - all 19 tools have rewritten descriptions that specify what data fields are returned, how to chain tools together, and what auth level is required. This significantly improves how well AI agents can select and use the right tool.
- **Retry logic** - the API client now automatically retries on `429 Too Many Requests` and `503 Service Unavailable` errors with exponential backoff (2s, then 4s, then 8s, up to 3 attempts). Quota errors (`403 quotaExceeded`) fail immediately with a clear message instead of retrying.
- **Error messages** - YouTube API error codes are now mapped to human-readable, actionable messages. For example: "Daily API quota exceeded. Try again after midnight Pacific Time."

### Fixed

- **`get_channel_metadata`** - replaced the deprecated `forUsername` API parameter with the current `forHandle` parameter. Channel lookups by username were silently returning empty results in the previous version.
- **`list_subscriptions`** - OAuth was incorrectly required for all subscription queries, blocking public channel lookups with an API key.
- **`registerTool` API** - all tools were registered using an unsafe `(server as any).registerTool()` workaround. All registrations have been migrated to the typed `server.registerTool()` API provided by the MCP SDK.
- **`server.json` version** - the version field was out of sync with `package.json`. Both now reflect `1.0.9`.

### Internal

> These are code quality improvements that do not affect how tools behave, but make the codebase easier to maintain and extend.

- Codebase split from a single 694-line `index.ts` into a modular structure: `api-client.ts` for shared utilities and seven domain-specific tool modules (`search`, `videos`, `channels`, `playlists`, `comments`, `oauth-tools`, `i18n`).
- All `params: any` and untyped handler arguments replaced with properly typed interfaces.
- `outputSchema` and `structuredContent` added to `get_video_metadata`, `get_channel_metadata`, and `list_playlists`, enabling AI clients that support the MCP structured output spec to receive typed, machine-readable data alongside the text response.
- Tool annotations (`readOnlyHint`, `openWorldHint`, `idempotentHint`) added to all tools so MCP clients can correctly classify tool side-effects.

---

## [1.0.8] and earlier

See [GitHub Releases](https://github.com/mrsknetwork/ytmcp/releases) for earlier version history.
