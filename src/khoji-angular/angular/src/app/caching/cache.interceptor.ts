import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CacheService } from './cache.service';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpResponse } from '@angular/common/http';
import { createCacheKey } from 'app/shared/helper-functions';

@Injectable()
export class CachingInterceptor implements HttpInterceptor {
    constructor(public cacheService: CacheService) { }

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        const cacheKey = createCacheKey(req, () => req.headers.get('instance_id'));
        const cachedResponse = this.cacheService.getCache(cacheKey);

        if (cachedResponse) {
            return of(cachedResponse);
        }

        return next.handle(req).pipe(
            tap((response) => {
                if (response instanceof HttpResponse) {
                    const [enabled, duration] = this.cacheService.canCache(req);

                    if (enabled) {
                        this.cacheService.setCache(cacheKey, response, duration);
                    }
                }
            })
        );
    }
}
