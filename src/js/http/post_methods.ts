import createAlert from "../util/base_page";
import {IBaseFetch} from "../api/http";
import {fetch} from '@tauri-apps/plugin-http';
import {defaultFetch} from "../default";
import {ECategories} from "../api/base";


// 封装的fetch方法
export default async function baseFetch(url: string, opts: IBaseFetch = {}): Promise<Response> {
    const options: IBaseFetch = {
        ...defaultFetch,
        ...opts
    };

    if (options.method === 'GET') options.body = null;

    const response = await fetch(url, options);
    const status = response.status;

    if (!response.ok && !options.ignore_err?.includes(status)) statusAlert(status);
    return response;
}

// 默认的错误处理
const errors: Map<number, [string, ECategories]> = new Map([
    [400, ['不支持的请求', 'warning']],
    [401, ['您还没有登录', 'warning']],
    [404, ['访问资源不存在', 'warning']],
    [405, ['不允许的请求', 'error']],
    [429, ['请求速率限制', 'error']],
    [500, ['服务器未能处理请求', 'error']],
]);

function statusAlert(statusCode: number = 404) {
    const msg = errors.get(statusCode) ?? [`未知错误: ${statusCode}`, 'error'];
    createAlert(msg[0], msg[1]);
}