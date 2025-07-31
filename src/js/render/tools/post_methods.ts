import createAlert from "./base_page";
import {IBaseFetch} from "../../interfaces/post";
import {ECategories} from "../../interfaces/pages";
import {fetch} from '@tauri-apps/plugin-http';


// 封装的fetch方法
export default async function baseFetch(url: string, opts: IBaseFetch = {}) {
    const defaultOpts: IBaseFetch = {
        method: 'POST',
        body: '',
        headers: {
            'Content-Type': 'application/json',
        },
        referrer: "about:client",
        cache: 'default',
        ignore_err: [],
        ...opts
    };
    if (defaultOpts.method === 'GET') defaultOpts.body = null;

    const response_promise = fetch(url, defaultOpts);

    const response = await response_promise;
    const status = response.status;

    if (!response.ok && !defaultOpts.ignore_err.includes(status)) _statusAlert(status);
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

function _statusAlert(statusCode = 404) {
    const msg = errors.get(statusCode) ?? [`未知错误: ${statusCode}`, ECategories.ERROR];
    createAlert(msg[0], msg[1]);
}