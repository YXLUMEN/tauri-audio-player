import {Pair} from "../types/types.ts";
import {dbHelper} from "../database/db_init.ts";
import baseFetch from "./post_methods.ts";
import {createAlert} from "../util/alert.ts";

export class ArtAuth {
    private static readonly AUTH_URL: string = 'https://arctic-red-tide.xyz/api/auth';
    private static readonly REFRESH_URL: string = 'https://arctic-red-tide.xyz/api/refresh';

    private accessToken: string = '';
    private refreshToken: string = '';

    public access() {
        return this.accessToken;
    }

    public async loadToken(): Promise<void> {
        const access = await dbHelper.get<Token>('token', 'access_token');
        if (access.isOk()) {
            const key = access.unwrap();
            if (key) this.accessToken = key.value;
        }

        const refresh = await dbHelper.get<Token>('token', 'refresh_token');
        if (refresh.isOk()) {
            const key = refresh.unwrap();
            if (key) this.refreshToken = key.value;
            return;
        }
    }

    public async login(key: string, psd: string): Promise<boolean> {
        const result = await baseFetch(ArtAuth.AUTH_URL, {
            body: JSON.stringify({key, psd}),
        });

        if (result.isErr()) {
            console.error(result.unwrapErr());
            return false;
        }

        const {access_token, refresh_token} = await result.unwrap().json();
        this.accessToken = access_token;
        this.refreshToken = refresh_token;

        await dbHelper.update<Token>('token', {key: 'access_token', value: access_token});
        await dbHelper.update<Token>('token', {key: 'refresh_token', value: refresh_token});

        return true;
    }

    public async refresh(): Promise<boolean> {
        const result = await baseFetch(ArtAuth.REFRESH_URL, {
            body: JSON.stringify({refresh_token: this.refreshToken}),
        });

        if (result.isErr()) {
            console.error(result.unwrapErr());
            return false;
        }

        const json = await result.unwrap().json();
        if (!json) {
            createAlert('无法连接认证服务器', 'warning');
            return false;
        }

        if (json['status'] === 2013) {
            createAlert('Token 失效', 'warning');
            return false;
        }

        if (json['status'] !== 1016) {
            createAlert('认证失败', 'warning');
            return false;
        }

        const access_token = json['access_token'];
        if (typeof access_token !== 'string') return false;

        this.accessToken = access_token;
        const storageResult = await dbHelper.update<Token>('token', {key: 'access_token', value: access_token});
        return storageResult.isOk();
    }
}

type Token = Pair<string, string>;