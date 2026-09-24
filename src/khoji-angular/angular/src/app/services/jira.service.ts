/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, Subject } from 'rxjs';
import { catchError, debounceTime, map, shareReplay, switchMap } from 'rxjs/operators';
import { HttpService } from './common/http.service';
import { JiraIssueSearchResponse } from 'app/interface/jira-issue-search-response.interface';
import { environment } from 'environments/environment';
import { TrackingService, UserActions } from 'app/services/tracking/';
import { UnleashService } from 'app/services/unleash.service';
import { v4 as uuidv4 } from 'uuid';
import { LOGIN_PAGE_URL } from 'app/shared/helper-functions';
import { ATLASSIAN_SSO_STATE } from 'app/login/login.component';

export interface JiraIssueItem {
  id: number;
  key: string;
  summary: string;
  img: string;
}

export interface TokenScopesResponse {
  success: boolean;
  hasPermissions: boolean;
  features?: string[];
  requiredScopes?: string[] | null;
  instanceName?: string;
  userId?: number;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class JiraService {
  private cache = new Map<string, Observable<any>>();
  private searchSubject = new Subject<string>();

  constructor(
    private http: HttpService,
    private httpClient: HttpClient,
    private trackingService: TrackingService,
    private unleashService: UnleashService
  ) {}

  getTicketDetails(ticketId: string): Observable<any> {
    ticketId = ticketId?.trim();
    if (!ticketId) throw new Error('ticketId required');

    if (!this.cache.has(ticketId)) {
      const req$ = this.http
        .apiGetRequest(`/issue/detail?query=${encodeURIComponent(ticketId)}`)
        .pipe(
          // map to expected shape if needed
          map((r: any) => ({
            key: r.key ?? ticketId,
            summary: r.summary ?? r.fields?.summary ?? '',
            status: r.status ?? r.fields?.status?.name ?? '',
            assignee: r.assignee ?? r.fields?.assignee?.displayName ?? 'Unassigned',
            priority: r.priority ?? r.fields?.priority?.name ?? '',
            description: r.description ?? r.fields?.description ?? '',
            url: r.url ?? '' // optional; directive will fallback to base URL
          })),
          shareReplay({ bufferSize: 1, refCount: false })
        );

      this.cache.set(ticketId, req$);
    }

    return this.cache.get(ticketId)!;
  }

  // For forcibly refresh (optional)
  refreshTicket(ticketId: string): Observable<any> {
    this.cache.delete(ticketId);
    return this.getTicketDetails(ticketId);
  }

  /**
   * Trigger a search for Jira issues
   * @param search The search query string
   */
  searchIssues(search: string): void {
    this.searchSubject.next(search);
  }

  /**
   * Get an observable of search results with debouncing
   * @param debounce Debounce time in milliseconds (default: 100)
   * @returns Observable of JiraIssueItem array
   */
  getSearchResults(debounce: number = 100): Observable<JiraIssueItem[]> {
    return this.searchSubject.pipe(
      debounceTime(debounce),
      switchMap((search) => this.performSearch(search))
    );
  }

  private performSearch(search: string): Observable<JiraIssueItem[]> {
    if (!search) {
      return of([]);
    }

    return this.http
      .apiGetRequest<JiraIssueSearchResponse[]>(`${environment.ISSUE_SEARCH_API}${encodeURIComponent(search)}`)
      .pipe(
        catchError((_) => of([] as JiraIssueSearchResponse[])),
        map((data) => data.map(({ id, key, img, summaryText: summary }) => ({ id, key, summary, img })))
      );
  }

  /**
   * POST /api/jira/app-scopes
   * - Fetches enabled feature flags from Unleash and sends their names to
   *   the backend so it can return the Jira scopes required for those
   *   enabled features.
   * - The backend will include required base scopes for known features.
   * - If no features are enabled, return the default scopes locally so
   *   callers still receive the required base scopes.
   * - Do NOT call the backend with an empty `features` payload.
   */
  getAppScopes(): Observable<string[]> {
    // Read default scopes from environment; support both `string[]` and
    // space/comma-separated `string` (possibly URL-encoded) coming from Docker
    // env vars. Return a normalized `string[]`.
    const parseScopes = (input: string | string[] | undefined): string[] => {
      if (!input) return [];
      if (Array.isArray(input)) return input.filter(Boolean);
      // try to decode URI-encoded input; if decode fails, use raw value
      try { input = decodeURIComponent(input); } catch { /* ignore */ }
      return input.split(/\s*,\s*|\s+/).filter(Boolean);
    };

    const defaultScopes: string[] = parseScopes(environment.JIRA_DEFAULT_SCOPES);

    return this.unleashService.getEnabledFeatures().pipe(
      map((features) => features.map(f => f.name).filter(Boolean)),
      switchMap((featureNames) => {
        // If no feature flags are enabled, return the default scopes
        // locally instead of calling the backend with an empty payload.
        if (!featureNames || featureNames.length === 0) {
          return of(defaultScopes);
        }

        return this.httpClient.post<{ success?: boolean; features?: string[]; scopes?: string[] }>('/api/jira/app-scopes', { features: featureNames }).pipe(
          map(resp => resp?.scopes ?? []),
          catchError(() => of([]))
        );
      }),
      catchError(() => of([]))
    );
  }

  /**
   * POST /api/jira/token-scopes
   * - Returns which Jira scopes are required for the provided feature flags
   *   for a given instance/user. Mirrors the backend response shape.
   * - Client-side validates inputs and returns a safe fallback on error.
   */
  getTokenScopes(instanceName: string, userId: number, features: string[]): Observable<TokenScopesResponse> {
    instanceName = (instanceName || '').trim();
    const cleanedFeatures = Array.isArray(features) ? features.map(f => (f || '').trim()).filter(Boolean) : [];

    if (!instanceName || !userId || cleanedFeatures.length === 0) {
      return of({ success: false, hasPermissions: false, features: [], requiredScopes: null, error: 'Missing required fields: instanceName, userId, features (non-empty array)' });
    }

    const payload = { instanceName, userId, features: cleanedFeatures };
    return this.httpClient.post<TokenScopesResponse>('/api/jira/token-scopes', payload).pipe(
      catchError(() => of({ success: false, hasPermissions: false, features: [], requiredScopes: null }))
    );
  }

  /**
   * Redirect the browser to Atlassian's auth endpoint.
   * - `scopes` may be a space-joined string or string[]; if omitted/empty
   *   the method will fetch scopes from `getAppScopes()`.
   * - NOTE: this method does NOT add or remove the `offline_access` scope;
   *   the caller or `getAppScopes()` is expected to include it when required.
   */
  redirectToAtlassianAuth(scopes?: string | string[] | null): void {
    this.trackingService.captureUserAction(UserActions.Login.Request_Jira_Access);
    const state = uuidv4();
    localStorage.setItem(ATLASSIAN_SSO_STATE, state);
    const clientId = environment.JIRA_CLIENT_ID;
    
    // sanity check: make sure the frontend has a real Jira OAuth client id
    if (!clientId || clientId.trim() === '' || clientId.includes('/run/secrets')) {
      // this usually means the build is running with the default placeholder
      // or a file path (docker) instead of the actual ID.  Developers should
      // set NG_JIRA_CLIENT_ID in their local environment or verify the
      // value injected at runtime (see README).
      console.error('Invalid JIRA client id detected when redirecting:', clientId);
      // throw so callers can see there was a configuration problem rather
      // than hitting Atlassian with a bogus value.  The error message in the
      // screenshot (`failed to retrieve client`) comes from the remote side.
      throw new Error('JIRA_CLIENT_ID is not configured correctly');
    }

    const redirectUri = encodeURIComponent(LOGIN_PAGE_URL);

    const buildAndRedirect = (scopeInput: string | string[]) => {
      let scopeStr: string;

      if (Array.isArray(scopeInput)) {
        const set = new Set(scopeInput.filter(Boolean));
        scopeStr = Array.from(set).join(' ');
      } else {
        scopeStr = (scopeInput || '').trim();
      }

      const encodedScopes = encodeURIComponent(scopeStr);
      const authUrl = `https://auth.atlassian.com/authorize?audience=api.atlassian.com&client_id=${clientId}&scope=${encodedScopes}&redirect_uri=${redirectUri}&response_type=code&prompt=select_account&state=${state}`;
      window.location.href = authUrl;
    };

    const isEmptyScopes = (s: any) => s == null || (Array.isArray(s) && s.length === 0) || (typeof s === 'string' && s.trim() === '');

    if (isEmptyScopes(scopes)) {
      // fetch scopes from backend; fallback to empty scopes on error
      this.getAppScopes().subscribe(
        (scopesArr) => buildAndRedirect(scopesArr),
        () => buildAndRedirect('')
      );
    } else {
      buildAndRedirect(scopes as any);
    }
  }
}
