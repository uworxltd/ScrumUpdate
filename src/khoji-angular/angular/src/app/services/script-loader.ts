import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class ScriptLoaderService {

    constructor() { }

    loadScript(url: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.async = true; // Load asynchronously
            script.defer = true; // Defer execution until HTML parsing is complete

            script.onload = () => {
                resolve();
            };

            script.onerror = (error) => {
                reject(error);
            };

            document.body.appendChild(script);
        });
    }
}