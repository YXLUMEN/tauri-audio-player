import {fetch} from '@tauri-apps/plugin-http';
import {AppFetch} from "../types/AppFetch.ts";
import {Result} from "../util/Result.ts";
import {AlertCategories} from "../types/AlertCategories.ts";


export default async function baseFetch(url: string, opts?: AppFetch): Promise<Result<Response, Error>> {
    try {
        const options: AppFetch = {
            method: 'POST',
            body: '',
            headers: {
                'Content-Type': 'application/json',
            },
            referrer: "about:client",
            cache: 'default',
            ...opts
        };

        if (options.method === 'GET') options.body = null;

        const response = await fetch(url, options);
        const status = response.status;

        if (!response.ok && !options.ignore_err?.includes(status)) statusAlert(status);
        return Result.ok(response);
    } catch (err) {
        console.error(err);
        if (Error.isError(err)) {
            return Result.err(err);
        }
        return Result.err(new Error('Fail while fetching resource'));
    }
}

// 默认的错误处理
const errors: Map<number, [string, AlertCategories]> = new Map([
    [400, ['不支持的请求', 'warning']],
    [401, ['您还没有登录', 'warning']],
    [404, ['访问资源不存在', 'warning']],
    [405, ['不允许的请求', 'error']],
    [429, ['请求速率限制', 'error']],
    [500, ['服务器未能处理请求', 'error']],
]);

function statusAlert(statusCode: number = 404) {
    const msg = errors.get(statusCode) ?? [`未知错误: ${statusCode}`, 'error'];
    alert(msg[0]);
}