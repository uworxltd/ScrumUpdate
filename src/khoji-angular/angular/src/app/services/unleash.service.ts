import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { EVENTS, UnleashClient, IConfig } from 'unleash-proxy-client';
import { fromEvent, Observable, of, merge, interval, EMPTY } from 'rxjs';
import { debounceTime, distinctUntilChanged, delay, filter, map, shareReplay, startWith } from 'rxjs/operators';
import { IContext } from 'unleash-proxy-client';
import { environment } from 'environments/environment';

const config: IConfig = {
  url: `${environment.UNLEASH_URL}/api/frontend`,
  appName: 'scrumupdate-web',
  clientKey: environment.UNLEASH_API_TOKEN,
  disableMetrics: true,
  disableRefresh: false,
  metricsInterval: 60,
  refreshInterval: 10,
};

export interface BaseEvent {
  eventType: string;
  eventId: string;
  context: IContext;
  enabled: boolean;
  featureName: string;
  impressionData?: boolean;
}

export interface ImpressionEvent extends BaseEvent {
  variant?: string;
}

// Stored feature shape kept in localStorage under key 'unleash:repository:repo'
export interface UnleashFeature {
  name: string;
  enabled: boolean;
  variant?: any;
  impressionData?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class UnleashService {
  unleash: UnleashClient;
  initialized$: Observable<void>;
  error$: Observable<unknown>;
  ready$: Observable<void>;
  update$: Observable<void>;
  impression$: Observable<ImpressionEvent>;
  isIntergated = () => environment.UNLEASH;

  constructor(private http: HttpClient) {
    if (this.isIntergated() && config.clientKey) {
      this.init();
    }
  }

  init() {
    this.unleash = new UnleashClient(config);
    this.initialized$ = fromEvent<void>(this.unleash, EVENTS.INIT).pipe(shareReplay({ bufferSize: 1, refCount: true }));
    this.error$ = fromEvent<unknown>(this.unleash, EVENTS.ERROR).pipe(shareReplay({ bufferSize: 1, refCount: true }));
    this.ready$ = fromEvent<void>(this.unleash, EVENTS.READY).pipe(shareReplay({ bufferSize: 1, refCount: true }));
    this.update$ = fromEvent<void>(this.unleash, EVENTS.UPDATE).pipe(shareReplay({ bufferSize: 1, refCount: true }));
    this.impression$ = fromEvent<ImpressionEvent>(this.unleash, EVENTS.IMPRESSION).pipe(shareReplay({ bufferSize: 1, refCount: true }));

    this.unleash.start();

    // this.initialized$.subscribe(() => {
    //   console.log('Unleash client initialized');
    // });
    // this.error$.subscribe((error) => {
    //   console.error('Unleash client error:', error);
    // });
    // this.ready$.subscribe(() => {
    //   console.log('Unleash client is ready');
    // });
    // this.update$.subscribe(() => {
    //   console.log('Unleash client is ready');
    // });
  }

  isEnabled(featureFlag: string): boolean {
    if (!this.isIntergated()) return false;
    try {
      return this.unleash?.isEnabled(featureFlag) ?? false;
    } catch {
      return false;
    }
  }


  isFeatureEnabled(
    featureFlag: string,
    defaultValue: boolean
  ): Observable<boolean> {
    if (!this.isIntergated()) {
      return of(defaultValue);
    }

    const initialized = !!localStorage.getItem("unleash:repository:repo");
    let stream = this.update$?.pipe(startWith(null));

    return stream?.pipe(
      map(() => this.isEnabled(featureFlag)),
      // tap(enabled => {
      //   console.log(`Feature flag ${featureFlag} is ${enabled ? 'enabled' : 'disabled'}`);
      // }),
      // catchError(err => {
      //   console.error(`Error checking feature flag ${featureFlag}:`, err);
      //   return of(defaultValue);
      // }),
      distinctUntilChanged(),
      debounceTime(initialized ? 0 : 3000),
    );
  }

  /**
   * Observable that emits the list of enabled features stored in localStorage under
   * the key 'unleash:repository:repo'. Emits on subscription and whenever the
   * underlying localStorage value changes (cross-tab via `storage` event or via
   * Unleash `update$` in the same tab). Falls back to polling when `update$` is
   * not available.
   */
  getEnabledFeatures(): Observable<UnleashFeature[]> {
    const parse = (): UnleashFeature[] => {
      try {
        const raw = localStorage.getItem('unleash:repository:repo');
        if (!raw) return [];
        const parsed = JSON.parse(raw) as UnleashFeature[];
        if (!Array.isArray(parsed)) return [];
        return parsed.filter(f => !!f && f.enabled);
      } catch (err) {
        console.warn('[Unleash] Failed to parse unleash:repository:repo from localStorage', err);
        return [];
      }
    };

    const initial$ = of(parse());

    // Coalesce rapid successive updates (e.g. Unleash emits bursts during reload)
    // to avoid running subscribers multiple times for transient changes.
    // Increase/decrease EMIT_DEBOUNCE_MS if you need a different debounce window.
    const EMIT_DEBOUNCE_MS = 500;

    const storage$ = fromEvent<StorageEvent>(window, 'storage').pipe(
      filter(evt => evt.key === 'unleash:repository:repo'),
      map(evt => {
        // Prefer the StorageEvent.newValue (cross-tab) to avoid reading stale localStorage
        try {
          if (!evt.newValue) return [] as UnleashFeature[];
          const parsed = JSON.parse(evt.newValue) as UnleashFeature[];
          if (!Array.isArray(parsed)) return [] as UnleashFeature[];
          return parsed.filter(f => !!f && f.enabled);
        } catch (err) {
          console.warn('[Unleash] Failed to parse storage event newValue for unleash:repository:repo', err);
          return [] as UnleashFeature[];
        }
      })
    );

    // Delay the update$ parse to ensure any localStorage writes performed by the
    // Unleash client have completed (prevents reading the pre-update value).
    const update$ = this.update$ ? this.update$.pipe(delay(0), map(() => parse())) : EMPTY;
    const poll$ = !this.update$ ? interval(1000).pipe(map(() => parse())) : EMPTY;

    // Debounce the merged stream so the *first* emission is delayed by
    // EMIT_DEBOUNCE_MS and rapid consecutive emissions are consolidated.
    return merge(initial$, storage$, update$, poll$).pipe(
      debounceTime(EMIT_DEBOUNCE_MS),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

  setInstanceName(instanceName: string) {
    if (this.unleash) {
      this.unleash.setContextField('instanceName', instanceName);
    }
  }

  setUserId(userId: string) {
    if (this.unleash) {
      this.unleash.setContextField('userId', userId);
    }
  }

  setUserEmail(email: string) {
    if (this.unleash) {
      this.unleash.setContextField('userEmail', email);
    }
  }
}
