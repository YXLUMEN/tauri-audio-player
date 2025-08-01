import {fetch} from "@tauri-apps/plugin-http";

export class AuthToken {
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
        if (!res.ok) {
            throw new Error(`Can not authenticate: ${res.status}`);
        }

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
        if (!res.ok) {
            throw new Error(`Fail to fetch access: ${res.status}`);
        }

        const {access_token} = await res.json();
        this.accessToken = access_token;
    }
}