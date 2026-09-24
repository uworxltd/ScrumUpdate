import { Injectable } from '@angular/core';

@Injectable()
/**
 * TODO: test coverage or update to ngx-cookie-service when we update angular version 
 */
export class CookiesService {

    constructor() {}

    /**
     * delete cookie
     * @param name
     */
    public delete(name) {
        this.set(name, '', -1);
    }

    /**
     * get cookie
     * @param {string} name
     * @returns {string}
     */
    public get(name: string) {
        const ca: Array<string> = decodeURIComponent(document.cookie).split(';');
        const caLen: number = ca.length;
        const cookieName = `${name}=`;
        let c: string;

        for (let i  = 0; i < caLen; i += 1) {
            c = ca[i].replace(/^\s+/g, '');
            if (c.indexOf(cookieName) === 0) {
                return c.substring(cookieName.length, c.length);
            }
        }
        return '';
    }

    /**
     * set cookie
     * @param {string} name
     * @param {string} value
     * @param {number} expireHours
     * @param {string} path
     */
    public set(name: string, value: string, expireHours: number, path: string = '/') {
        const d: Date = new Date();
        d.setHours(d.getHours() + expireHours);
        const expires = `expires=${d.toUTCString()}`;
        const cpath = path ? `; path=${path}` : '';
        document.cookie = `${name}=${value}; ${expires}${cpath}; SameSite=Lax`;
    }

}