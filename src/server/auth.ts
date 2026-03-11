import { google } from 'googleapis';
import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import os from 'os';
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";

const SCOPES = [
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/youtube.force-ssl'
];

const TOKEN_PATH = path.join(os.homedir(), '.ytmcp_tokens.json');

async function secureTokenFile(): Promise<void> {
    try {
        const stats = await fs.stat(TOKEN_PATH);
        if (stats) {
            await fs.chmod(TOKEN_PATH, 0o600);
        }
    } catch (err) {
    }
}

let activeAuthServer: any = null;
let pendingAuthUrl: string = '';

export async function authorize(apiKey?: string): Promise<{ type: string, key?: string, client?: any }> {
    // Priority 1: CLI-provided API Key
    if (apiKey) {
        return { type: 'apiKey', key: apiKey };
    }

    // Priority 2: Environment-provided API Key
    if (process.env.GOOGLE_API_KEY) {
        return { type: 'apiKey', key: process.env.GOOGLE_API_KEY };
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        // Worst Scenario: No credentials found. 
        // We return a "guest" indicator instead of throwing, so the server can still start.
        return { type: 'guest' };
    }

    const oauth2Client: any = new google.auth.OAuth2(
        clientId,
        clientSecret,
        'http://localhost:31415/oauth2callback'
    );

    try {
        await secureTokenFile();
        const token = await fs.readFile(TOKEN_PATH, 'utf-8');
        oauth2Client.setCredentials(JSON.parse(token));

        // Setup an event listener to automatically save refreshed tokens
        oauth2Client.on('tokens', async (tokens: any) => {
            try {
                // Merge new tokens with any existing ones (so we don't lose the refresh_token)
                const currentTokenData = await fs.readFile(TOKEN_PATH, 'utf-8').catch(() => '{}');
                const parsedCurrent = JSON.parse(currentTokenData);
                const mergedTokens = { ...parsedCurrent, ...tokens };

                await fs.writeFile(TOKEN_PATH, JSON.stringify(mergedTokens));
                await secureTokenFile();
            } catch (saveErr) {
                console.error('Failed to save refreshed tokens:', saveErr);
            }
        });

        return { type: 'oauth', client: oauth2Client };
    } catch (err: any) {
        startAuthServer(oauth2Client);

        // Return a specific crafted prompt instructing the LLM to ask the user nicely
        throw new McpError(
            ErrorCode.InvalidRequest,
            `Authentication Required. Please politely tell the user: "To use YouTube MCP, you need to authenticate with your Google account." \n\nProvide them this exact markdown link so they can click it explicitly: [Open Authentication](${pendingAuthUrl}) \n\nInstruct them to tell you when they are finished logging in so you can retry the tool call. If they wish to Deny, cancel the operation.`
        );
    }
}

export async function revokeToken(): Promise<void> {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error('OAuth2 credentials missing. Cannot revoke token.');
    }

    const oauth2Client: any = new google.auth.OAuth2(
        clientId,
        clientSecret,
        'http://localhost:31415/oauth2callback'
    );

    try {
        const tokenData = await fs.readFile(TOKEN_PATH, 'utf-8');
        const tokens = JSON.parse(tokenData);

        if (tokens.access_token || tokens.refresh_token) {
            await oauth2Client.revokeToken(tokens.access_token || tokens.refresh_token);
        }

        await fs.unlink(TOKEN_PATH);
        console.error('Tokens revoked and local storage cleared.');
    } catch (err: any) {
        if (err.code === 'ENOENT') {
            console.error('No token file found to revoke.');
        } else {
            console.error('Error during token revocation:', err.message);
            throw err;
        }
    }
}

function startAuthServer(oauth2Client: any): void {
    if (activeAuthServer) return; // Prevent spawning multiple listeners

    const app: any = express();

    // Security Best Practice: Implement Anti-IFrame Headers
    app.use((req: any, res: any, next: any) => {
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('Content-Security-Policy', "frame-ancestors 'none'");
        next();
    });

    // Security Best Practice: Generate state for CSRF protection
    const stateToken = crypto.randomBytes(32).toString('hex');
    
    // Security Best Practice: Generate PKCE Verifier and Challenge 
    const codeVerifier = crypto.randomBytes(32).toString('hex');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

    // Request a refresh token explicitly + prompt consent so it's always granted on new logins
    pendingAuthUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        state: stateToken,
        prompt: 'consent',
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        include_granted_scopes: true // Best Practice: Incremental Authorization
    });

    app.get('/oauth2callback', async (req: any, res: any) => {
        // Security Best Practice: Validate state parameter to prevent CSRF / Confused Deputy attacks
        const returnedState = req.query.state as string;
        if (returnedState !== stateToken) {
            res.status(403).send('CSRF Token Mismatch! Authentication Failed.');
            if (activeAuthServer) {
                activeAuthServer.close();
                activeAuthServer = null;
            }
            return;
        }

        const code = req.query.code as string;
        if (!code) {
            res.status(400).send('Failure! No access code provided.');
            if (activeAuthServer) {
                activeAuthServer.close();
                activeAuthServer = null;
            }
            return;
        }

        try {
            const { tokens } = await oauth2Client.getToken({
                code: code,
                codeVerifier: codeVerifier
            });
            await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens));
            await secureTokenFile();
            console.error('Token stored securely to', TOKEN_PATH);
            res.send('<html><body style="font-family: sans-serif; padding: 2rem;"><h2>Authentication successful!</h2><p>You can close this tab and return to Claude to continue your request.</p></body></html>');
        } catch (err: any) {
            console.error('Error retrieving access token', err);
            res.status(500).send('Authentication Failed. Check Server Logs.');
        } finally {
            if (activeAuthServer) {
                activeAuthServer.close();
                activeAuthServer = null;
            }
        }
    });

    activeAuthServer = app.listen(31415, '127.0.0.1', () => {
        console.error('Background Auth Server listening silently for callbacks on port 31415...');
    });

    // Best Practice: Implement a timeout for the temporary server
    setTimeout(() => {
        if (activeAuthServer) {
            console.error('Auth server timed out after 15 minutes. Closing...');
            activeAuthServer.close();
            activeAuthServer = null;
        }
    }, 15 * 60 * 1000);
}
