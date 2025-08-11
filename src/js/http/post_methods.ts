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
const errors = new Map([
    [400, ['不支持的请求', ECategories.WARNING]],
    [401, ['您还没有登录', ECategories.WARNING]],
    [404, ['访问资源不存在', ECategories.WARNING]],
    [405, ['不允许的请求', ECategories.ERROR]],
    [429, ['请求速率限制', ECategories.ERROR]],
    [500, ['服务器未能处理请求', ECategories.ERROR]]
]);

function statusAlert(statusCode: number = 404) {
    const msg = errors.get(statusCode) ?? [`未知错误: ${statusCode}`, ECategories.ERROR];
    createAlert(msg[0], msg[1]);
}