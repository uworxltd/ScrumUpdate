import { HttpClient, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { observableToPromise } from 'app/shared/helper-functions';

const CACHE_CONFIG_URL = 'assets/cache.conf.json';
type requestFilterType = "params" | "headers" | "body";
type requestFilters = Record<requestFilterType, { [key: string]: any }>;

/* Configuration for the cache service */
interface CacheConfig {
    /* Whether the cache is enabled for all request other than the ones defined in requests array  */
    enabled: boolean;
    /* Default cache duration in seconds */
    duration: number;
    /* URL pattern that identifies the request */
    url: string;
    /* HTTP method that identifies the request */
    method: string;
    /* URL pattern that identifies the page in browser address bar where request is triggering */
    pages?: string[];
    /* Array of request configurations */
    requests: CacheConfig[];
    /* filter to select a request based on query or payload */
    filters?: requestFilters;
}

@Injectable({ providedIn: 'root' })
export class CacheService {
    config: CacheConfig;
    private cache = new Map<string, any>();

    constructor(private http: HttpClient) { }

    async loadConfig() {
        const config$ = this.http.get<CacheConfig>(CACHE_CONFIG_URL);
        this.config = await observableToPromise(config$);
    }

    getRequestConfig(req: HttpRequest<any>) {
        if (!this.config) return null;

        const { url, method, params, headers, body } = req;
        return this.config.requests
            .find(r =>
                new RegExp(r.url).test(url)
                && r.method === method
                && (r.pages ? r.pages.some(page => new RegExp(page).test(location.href)) : true)
                && (r.filters ?
                    Object.entries(r.filters).every(([filterType, filterValues]) => {
                        let result = false;

                        switch (filterType as requestFilterType) {
                            case "params":
                                result = Object.entries(filterValues).every(([key, value]) => params[key] == value);
                            case "headers":
                                result = Object.entries(filterValues).every(([key, value]) => headers[key] == value);
                            case "body":
                                result = Object.entries(filterValues).every(([key, value]) => body[key] == value);
                        }

                        return result;
                    }) : true)
            );
    }

    canCache(req: HttpRequest<any>): [boolean, number] {
        const { url } = req;

        if (url === CACHE_CONFIG_URL) return [false, 0];

        const reqConfig = this.getRequestConfig(req);

        if (reqConfig) {
            return [reqConfig.enabled, reqConfig.duration || this.config.duration];
        }

        return [this.config.enabled, this.config.duration];
    }

    setCache(key: string, response: any, duration: number) {
        const data = { response, timestamp: new Date().getTime(), duration };
        this.cache.set(key, data);
    }

    getCache(key: string): any {
        const data = this.cache.get(key);


        if (data) {
            const { response, timestamp, duration } = data;
            const age = (new Date().getTime() - timestamp) / 1000;
            const expired = age > duration;
            // console.log('chached entry:', key);
            // console.log('age & duration:', age, duration);

            // Invalidate expired cache
            if (expired) {
                this.cache.delete(key);
            }
            else {
                return response;
            }
        }

        return null;
    }

    deleteCache(key: string) {
        this.cache.delete(key);
    }

    clearCache() {
        this.cache.clear();
    }
}