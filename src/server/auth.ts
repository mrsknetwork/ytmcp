import { google } from 'googleapis';
import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import os from 'os';

const SCOPES = [
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/youtube.force-ssl'
];


const TOKEN_PATH = path.join(os.homedir(), '.ytmcp_tokens.json');

async function secureTokenFile() {
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

export async function authorize(): Promise<any> {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET environment variables. These are strictly required for secure authentication.');
    }

    const oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        'http://localhost:3000/oauth2callback'
    );

    try {
        await secureTokenFile();
        const token = await fs.readFile(TOKEN_PATH, 'utf-8');
        oauth2Client.setCredentials(JSON.parse(token));

        // Setup an event listener to automatically save refreshed tokens
        oauth2Client.on('tokens', async (tokens) => {
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

        return oauth2Client;
    } catch (err) {
        startAuthServer(oauth2Client);

        // Return a specific crafted prompt instructing the LLM to ask the user nicely
        throw new Error(
            `Authentication Required. Please politely tell the user: "To use YouTube MCP, you need to authenticate with your Google account." \n\nProvide them this exact markdown link so they can click it explicitly: [Open Authentication](${pendingAuthUrl}) \n\nInstruct them to tell you when they are finished logging in so you can retry the tool call. If they wish to Deny, cancel the operation.`
        );
    }
}

function startAuthServer(oauth2Client: any) {
    if (activeAuthServer) return; // Prevent spawning multiple listeners

    const app = express();

    // Security Best Practice: Implement Anti-IFrame Headers
    app.use((req, res, next) => {
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('Content-Security-Policy', "frame-ancestors 'none'");
        next();
    });

    // Security Best Practice: Generate state for CSRF protection
    const stateToken = crypto.randomBytes(32).toString('hex');

    // Request a refresh token explicitly + prompt consent so it's always granted on new logins
    pendingAuthUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        state: stateToken,
        prompt: 'consent'
    });

    app.get('/oauth2callback', async (req, res) => {
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
            const { tokens } = await oauth2Client.getToken(code);
            await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens));
            await secureTokenFile();
            console.error('Token stored securely to', TOKEN_PATH);
            res.send('<html><body style="font-family: sans-serif; padding: 2rem;"><h2>Authentication successful!</h2><p>You can close this tab and return to Claude to continue your request.</p></body></html>');
        } catch (err) {
            console.error('Error retrieving access token', err);
            res.status(500).send('Authentication Failed. Check Server Logs.');
        } finally {
            if (activeAuthServer) {
                activeAuthServer.close();
                activeAuthServer = null;
            }
        }
    });

    activeAuthServer = app.listen(3000, '127.0.0.1', () => {
        console.error('Background Auth Server listening silently for callbacks...');
    });
}
