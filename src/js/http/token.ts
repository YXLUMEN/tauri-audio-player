import {fetch} from "@tauri-apps/plugin-http";

export class Token {
    public readonly authUrl: string;
    public readonly refreshUrl: string;
    public accessToken: string;
    public refreshToken: string;

    constructor(authUrl: string, refreshUrl: string) {
        this.authUrl = authUrl;
        this.refreshUrl = refreshUrl;
        this.accessToken = null;
        this.refreshToken = null;
    }

    public async authenticate(payload: any): Promise<void> {
        const res = await fetch(this.authUrl, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: {
                'Content-Type': 'application/json',
            },
        });

        const {access_token, refresh_token} = await res.json();
        this.accessToken = access_token;
        this.refreshToken = refresh_token;
    }

    public async refresh(payload: any): Promise<void> {
        const res = await fetch(this.refreshUrl, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: {
                'Content-Type': 'application/json',
            },
        });
        const {access_token} = await res.json();
        this.accessToken = access_token;
    }
}