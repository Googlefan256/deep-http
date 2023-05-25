import {
	request as request_,
	Response as RawResponse,
	defaultConfig as rawDefaultConfig,
	Config as RawConfig,
} from "deep-http-client";
import * as cookie from "tough-cookie";
import { URLSearchParams } from "url";
import FormData from "form-data";

function defaultConfig(): Config {
	return {
		...rawDefaultConfig(),
		cookieStore: true,
		ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ",
		responseType: "text",
	};
}

type Response = Omit<RawResponse, "body"> & {
	body: JSON | string | Buffer;
	req: ReqPeek;
};

type ReqPeek = {
	headers: Record<string, string>;
};

type JSONValues = string | number | boolean | null;

type JSONMap = {
	[key: string]: JSONMap | JSONValues | JSONValues[] | JSONMap[];
};

type JSON = JSONMap | JSONValues;

type RequestBody = JSON | string | Buffer | FormData | URLSearchParams;

type Config = RawConfig & {
	cookieStore: boolean;
	body?: RequestBody;
	ua?: string;
	responseType?: "json" | "text" | "buffer";
};

type PartialConfig = Partial<Config>;

class Client {
	private cfg: Config;
	private cookieStore: cookie.CookieJar = new cookie.CookieJar();
	constructor(cfg: PartialConfig) {
		this.cfg = { ...defaultConfig(), ...cfg };
	}
	async request(cfg: PartialConfig): Promise<Response> {
		const config: Config = { ...this.cfg, ...cfg };
		if (config.cookieStore) {
			const cookies = this.cookieStore.getCookiesSync(config.url);
			if (cookies.length > 0) {
				config.headers = {
					...config.headers,
					cookie: cookies.map((x) => x.value).join("; "),
				};
			}
		}
		if (config.body) {
			const body = config.body;
			if (body instanceof FormData) {
				config.headers = {
					...config.headers,
					"Content-Type": "multipart/form-data",
				};
				config.body = body.getBuffer();
			} else if (body instanceof URLSearchParams) {
				config.headers = {
					...config.headers,
					"Content-Type": "application/x-www-form-urlencoded",
				};
				config.body = body.toString();
			} else if (typeof body === "object") {
				config.headers = {
					...config.headers,
					"Content-Type": "application/json",
				};
				config.body = JSON.stringify(body);
			}
		}
		if (config.ua) {
			config.headers = {
				...config.headers,
				"User-Agent": config.ua,
			};
		}
		const rwresponse: RawResponse = await request_(config);
		if (rwresponse instanceof Error) {
			throw rwresponse;
		}
		if (config.cookieStore) {
			const c = rwresponse.headers["Set-Cookie"];
			if (c) {
				this.cookieStore.setCookieSync(c, config.url);
			}
		}
		const response: Response = {
			...rwresponse,
			req: {
				headers: config.headers,
			},
		};
		if (cfg.responseType) {
			if (cfg.responseType === "json") {
				response.body = JSON.parse(rwresponse.body.toString());
			} else if (cfg.responseType === "text") {
				response.body = rwresponse.body.toString();
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
		const config: PartialConfig = { ...this.cfg, url, ...cfg, method: "GET" };
		const response = await this.request(config);
		return response;
	}
	async post(
		url: string,
		body: RequestBody,
		cfg: PartialConfig
	): Promise<Response> {
		const config: PartialConfig = {
			...this.cfg,
			url,
			...cfg,
			method: "POST",
			body,
		};
		const response = await this.request(config);
		return response;
	}
	async put(
		url: string,
		body: RequestBody,
		cfg: PartialConfig
	): Promise<Response> {
		const config: PartialConfig = {
			...this.cfg,
			url,
			...cfg,
			method: "PUT",
			body,
		};
		const response = await this.request(config);
		return response;
	}
	async delete(url: string, cfg: PartialConfig): Promise<Response> {
		const config: PartialConfig = {
			...this.cfg,
			url,
			...cfg,
			method: "DELETE",
		};
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

export { get, post, put, del as delete, create };
