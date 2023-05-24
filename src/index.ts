import { request as request_, Response, defaultConfig as rawDefaultConfig, Config as RawConfig } from "deep-http-client";
import * as cookie from "tough-cookie";

function defaultConfig(): Config {
    return {
        ...rawDefaultConfig(),
        cookieStore: true,
    };
}

type Config = {
    cookieStore: boolean;
} & RawConfig;

type PartialConfig = Partial<Config>;

class Client {
    private cfg: Config;
    private cookieStore: cookie.CookieJar = new cookie.CookieJar();
    constructor(cfg: PartialConfig) {
        this.cfg = { ...defaultConfig(), ...cfg };
    }
    async request(cfg: PartialConfig): Promise<Response> {
        const config: Config = { ...this.cfg, ...cfg };
        if(config.cookieStore) {
            const cookies = this.cookieStore.getCookiesSync(config.url);
            if(cookies.length > 0) {
                config.headers = {
                    ...config.headers,
                    cookie: cookies.map(x => x.value).join("; "),
                };
            }
        }
        const response = await request_(config);
        if(config.cookieStore) {
            const c = response.headers["set-cookie"];
            if(c) {
                this.cookieStore.setCookieSync(c, config.url);
            }
        }
        return response;
    }
    async create(cfg: PartialConfig): Promise<Client> {
        const config: Config = { ...this.cfg, ...cfg };
        const client = new Client(config);
        return client;
    }
    async get(url: string, cfg: PartialConfig): Promise<Response> {
        const config: PartialConfig = { ...this.cfg, url, ...cfg ,method: "GET" };
        const response = await this.request(config);
        return response;
    }
    async post(url: string, cfg: PartialConfig): Promise<Response> {
        const config: PartialConfig = { ...this.cfg, url, ...cfg ,method: "POST" };
        const response = await this.request(config);
        return response;
    }
    async put(url: string, cfg: PartialConfig): Promise<Response> {
        const config: PartialConfig = { ...this.cfg, url, ...cfg ,method: "PUT" };
        const response = await this.request(config);
        return response;
    }
    async delete(url: string, cfg: PartialConfig): Promise<Response> {
        const config: PartialConfig = { ...this.cfg, url, ...cfg ,method: "DELETE" };
        const response = await this.request(config);
        return response;
    }
}

const client = new Client({});

export default client;

const get = client.get.bind(client);
const post = client.post.bind(client);
const put = client.put.bind(client);
const del = client.delete.bind(client);
function create(cfg: PartialConfig) {
    return new Client(cfg);
}

export {
    get,
    post,
    put,
    del as delete,
    create,
}