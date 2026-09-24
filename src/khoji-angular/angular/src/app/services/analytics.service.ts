/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { timeout, tap, catchError, shareReplay } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Constants } from '../constants';

// Exported interface for individual sprint signal
export interface SprintSignal {
  id: string;
  title: string;
  description: string;
  type: 'warning' | 'danger' | 'info';
  tickets: string[]; // Can contain ticket keys or dependency chains like "KFX-353 → KFX-250"
  recommendedAction: string;
  age?: string;
  source: 'human-sensed' | 'jira-insights';
  explanation?: string;
  isExpanded?: boolean; // Track expanded state for UI
  dependencies?: string[]; // Dependency chains as strings (e.g., ["KFX-353 → KFX-250", "KFX-354 → KFX-251"])
  workloadBreakdown?: { name: string; count: number }[]; // For consolidated workload imbalance
  velocityMetrics?: {
    completedPoints: number;
    totalPoints: number;
    completedIssues: number;
    totalIssues: number;
    targetPoints: number;
    avgPointsPerDay: number;
    requiredPointsPerDay: number;
    pointsRemaining: number;
    daysElapsed: number;
    daysRemaining: number;
    totalDays: number;
  };
  testingBottleneckMetrics?: {
    totalTicketCount: number;
    avgWaitTimeHours: number;
    ticketDetails: Array<{
      issue_key: string;
      title: string;
      assignee: string;
      in_progress_timestamp: string;
      awaiting_qa_timestamp: string;
      time_in_awaiting_qa_hours: number;
      current_status: string;
    }>;
  };
  overloadedAssignees?: Array<{ name: string; count: number; issues: string }>; // For workload imbalance
  isSummary?: boolean; // Flag for AI-generated summary cards
}

// Response interface using the exported SprintSignal interface
export interface SprintSignalsResponse {
  signals: SprintSignal[];
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private get baseUrl(): string {
    const protocol = window.location.protocol;
    const port = environment.SERVER_PORT;
    const serverName = environment.SERVER_NAME;
    return port.length > 0 ? `${protocol}//${serverName}:${port}` : `${protocol}//kbs.${serverName}`;
  }

  // Cache for in-flight requests to prevent duplicate calls
  private sprintSignalsCache = new Map<string, Observable<SprintSignalsResponse>>();

  constructor(private http: HttpClient) {}

  private getAuthTokenHeader(): HttpHeaders {
    let headerContent: HttpHeaders = new HttpHeaders();
    const token = localStorage.getItem(Constants.TOKEN_SESSION_KEY);

    if (token) {
      headerContent = new HttpHeaders({ Authorization: token });
    } else {
      console.warn('Authorization token is missing!');
    }
    return headerContent;
  }

  /**
   * Get JIRA-only sprint signals (fast, no AI processing)
   * Implements request deduplication - multiple simultaneous calls return the same Observable
   * @param sprintId The sprint ID
   * @deprecated Use getSprintSignalsJira() or getSprintSignalsHuman() instead
   */
  getSprintSignals(sprintId: string, source: 'jira-insights' | 'human-sensed' = 'jira-insights'): Observable<SprintSignalsResponse> {
    // Redirect to new specialized methods
    return source === 'jira-insights' ? this.getSprintSignalsJira(sprintId) : this.getSprintSignalsHuman(sprintId);
  }

  /**
   * Get JIRA-only sprint signals (optimized, ~2-5 seconds)
   * Implements request deduplication - multiple simultaneous calls return the same Observable
   * @param sprintId The sprint ID
   */
  getSprintSignalsJira(sprintId: string): Observable<SprintSignalsResponse> {
    const cacheKey = `${sprintId}-jira`;

    // If there's already an in-flight request for this sprint, return it
    if (this.sprintSignalsCache.has(cacheKey)) {
      return this.sprintSignalsCache.get(cacheKey);
    }

    const params = new HttpParams().set('sprintId', sprintId);
    const headers = this.getAuthTokenHeader();
    const url = `${this.baseUrl}/analytics/sprint-signals-jira`;

    // Create the observable with shareReplay to prevent duplicate HTTP requests
    const request$ = this.http.get<SprintSignalsResponse>(url, { params, headers }).pipe(
      tap(() => {
        // Clear cache after successful response
        this.sprintSignalsCache.delete(cacheKey);
      }),
      catchError((error) => {
        // Clear cache on error so retry is possible
        this.sprintSignalsCache.delete(cacheKey);
        // Re-emit error downstream
        throw error;
      }),
      timeout(30000), // 30 seconds - faster than human-sensed
      shareReplay(1) // Share the result with all subscribers
    );

    // Cache the observable
    this.sprintSignalsCache.set(cacheKey, request$);
    return request$;
  }

  /**
   * Get AI-enhanced sprint signals (comprehensive, ~15-30 seconds first call, ~2-5 seconds cached)
   * Implements request deduplication - multiple simultaneous calls return the same Observable
   * @param sprintId The sprint ID
   */
  getSprintSignalsHuman(sprintId: string): Observable<SprintSignalsResponse> {
    const cacheKey = `${sprintId}-human`;

    // If there's already an in-flight request for this sprint, return it
    if (this.sprintSignalsCache.has(cacheKey)) {
      return this.sprintSignalsCache.get(cacheKey);
    }

    const params = new HttpParams().set('sprintId', sprintId);
    const headers = this.getAuthTokenHeader();
    const url = `${this.baseUrl}/analytics/sprint-signals-human`;

    // Create the observable with shareReplay to prevent duplicate HTTP requests
    const request$ = this.http.get<SprintSignalsResponse>(url, { params, headers }).pipe(
      tap(() => {
        // Clear cache after successful response
        this.sprintSignalsCache.delete(cacheKey);
      }),
      catchError((error) => {
        // Clear cache on error so retry is possible
        this.sprintSignalsCache.delete(cacheKey);
        // Re-emit error downstream
        throw error;
      }),
      timeout(90000), // 90 seconds for AI processing
      shareReplay(1) // Share the result with all subscribers
    );

    // Cache the observable
    this.sprintSignalsCache.set(cacheKey, request$);
    return request$;
  }

  /**
   * Get sprint static summary
   * @param sprintId The sprint ID
   */
  getSprintStaticSummary(sprintId: string): Observable<any> {
    const params = new HttpParams().set('sprintId', sprintId);
    const headers = this.getAuthTokenHeader();
    return this.http.get<any>(`${this.baseUrl}/analytics/sprint-static-summary`, { params, headers });
  }

  /**
   * Get AI-powered insights for a specific ticket
   * Analyzes ticket timeline and provides what went wrong and recommended actions
   * @param issueKey The JIRA issue key (e.g., KFX-123)
   * @returns Observable with ticket insights
   */
  getTicketInsights(issueKey: string): Observable<any> {
    const params = new HttpParams().set('issueKey', issueKey);
    const headers = this.getAuthTokenHeader();
    return this.http.get<any>(`${this.baseUrl}/analytics/ticket-insights`, { params, headers }).pipe(
      timeout(60000), // 60 seconds for AI processing
      catchError((error) => {
        console.error(`Error fetching ticket insights for ${issueKey}:`, error);
        throw error;
      })
    );
  }

  /**
   * Get AI-powered insights for a specific epic
   * Analyzes epic progress, risks, and provides actionable recommendations
   * @param epicKey The JIRA epic key (e.g., KFX-284)
   * @param sprintId The sprint ID for context
   * @returns Observable with epic insights
   */
  getEpicInsights(epicKey: string, sprintId: string): Observable<any> {
    const params = new HttpParams().set('epicKey', epicKey).set('sprintId', sprintId);
    const headers = this.getAuthTokenHeader();
    return this.http.get<any>(`${this.baseUrl}/analytics/epic-insights`, { params, headers }).pipe(
      timeout(60000), // 60 seconds for AI processing
      catchError((error) => {
        console.error(`Error fetching epic insights for ${epicKey}:`, error);
        throw error;
      })
    );
  }
}
