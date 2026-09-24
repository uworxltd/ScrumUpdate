import { Injectable } from "@angular/core";
import { Actions, createEffect, ofType, } from "@ngrx/effects";
import { Store } from "@ngrx/store";
import { AiWorklogErrorCodes } from "app/interface/aiWorklogGenerationErrors.enum";
import { HttpService } from "app/services/common/http.service";
import { filterNbspFromHtml, formatDateString, getCurrentInstance, parseParametrizedString } from "app/shared/helper-functions";
import { getEndOfWeek, getStartOfWeek } from "app/shared/week-input/week-input.component";
import { AIGeneratedWorklog, AIGeneratedWorklogResponse, AIResponse, AISubmittedResponse, AISubmittedWorklogTickets, AppState, DailyScrumDates, DailyScrumUpdates, DeletionResponse, InstanceUser, IssueIdValidity, LoadingState, LogMyWorkSummary, WorklogItem } from "app/states/app-states";
import { discardSentCallsAfterNavigate, dummyAction, fetchError, updateWorkingHourPerDayConfig, updateWorklogConfigPerDayForLMW, WorkingHourPerDayConfigLoadingState } from "app/states/app.actions";
import { environment } from "environments/environment";
import { MessageService } from "primeng/api";
import { EMPTY, merge, Observable, of, Subject } from "rxjs";
import { catchError, delay, finalize, map, mergeMap, skipWhile, switchMap, take, takeUntil } from "rxjs/operators";
import { deleteWorklogs, editWorklogs, fetchInstanceUserMetaData, fetchIssueIdValidity, fetchWorklogSummary, fetchWorklogSummaryDefault, generateAIWorklog, resetAIGeneratedWorklogSubmissionResponse, setActivityState, setAIGeneratedWorklog, setAIGeneratedWorklogSubmissionLoadingState, setAIGeneratedWorklogSubmissionResponse, setDeleteWorkLogLoadingState, setDeleteWorkLogResponse, setEditWorkLogLoadingState, setEditWorkLogResponse, setGenerateAIWorklogLoadingState, setInstanceUserMetaData, setInstanceUserMetaDataLoadingState, setIssueIdValidity, setIssueIdValidityLoadingState, setManualWorklogSubmitted, setWorklogSummary, setWorklogSummaryLoadingState, submitWorklogs, submittedAIWorklogImpact, submitPopupWorklogs, setPopupGeneratedWorklogSubmissionLoadingState, submitManualWorkLog, setManualWorkLogLoadingState, resetAIGeneratedWorklog, pingAiCachePrompt, setPingAiCachePromptResponse, fetchWeeklyWorklogSummary, setWeeklyWorklogSummaryLoadingState, setWeeklyWorklogSummary, fetchDailyScrumUpdates, fetchDailyScrumUpdatesLoadingState, setDailyScrumUpdates, cancelDailyScrumUpdates, upsertDailyScrumUpdates, upsertDailyScrumUpdatesLoadingState, fetchSavedDailyScrumUpdates, setSavedDailyScrumUpdates, fetchTeamScrumUpdates } from "./log-my-work.action";
import { selectInstanceUser } from "./log-my-work.selector";
import { GenerateAIWorklogRequest } from "app/shared/picklist/interfaces";
import { TrackingService, UserActions } from "app/services/tracking";
import { SavedDailyScrumUpdate } from "app/interface/daily-scrum-update.interface";

@Injectable()
export class LogMyWorkEffect {

  previousParams: GenerateAIWorklogRequest;
  cancelPreviousRequest$ = new Subject<void>();

  constructor(
    private actions$: Actions,
    private http: HttpService,
    private store: Store<AppState>,
    private messageService: MessageService,
    private trackingService: TrackingService
  ) { }


  instanceUserEffect$ = createEffect(() => this.actions$.pipe(
    ofType(fetchInstanceUserMetaData),
    mergeMap((action) => this.fetchInstanceUser(action).pipe(map((res) => this.dispatchInstanceUser(res))))
  ));

  fetchInstanceUser(action) {
    this.store.dispatch(setInstanceUserMetaDataLoadingState({ loadingState: LoadingState.Loading }))
    const url = environment.INSTANCE_USER;
    return <Observable<InstanceUser>>this.http.apiGetRequest(url)
      .pipe(
        takeUntil(
          this.actions$.pipe(
            ofType(
              discardSentCallsAfterNavigate
            )
          )
        ),
        delay(1000),
        catchError(error => {
          this.store.dispatch(setInstanceUserMetaDataLoadingState({ loadingState: LoadingState.Error }))
          return of(this.store.dispatch(fetchError()));
        })
      );
  }

  dispatchInstanceUser(instanceUser: InstanceUser) {
    if (!instanceUser) {
      this.store.dispatch(setInstanceUserMetaDataLoadingState({ loadingState: LoadingState.Error }))
      return fetchError();
    }
    this.store.dispatch(setInstanceUserMetaData({ user: instanceUser }))
    this.store.dispatch(setInstanceUserMetaDataLoadingState({ loadingState: LoadingState.Done }))
    return dummyAction();
  }

  worklogSummaryDefaultEffect$ = createEffect(() => this.actions$.pipe(
    ofType(fetchWorklogSummaryDefault),
    switchMap(() => this.store.pipe(
      selectInstanceUser,
      skipWhile(user => !user.accountId),
      take(1),
      mergeMap(user => {
        return of(fetchWorklogSummary({
          payload: {
            accountId: user.accountId,
            startDate: getStartOfWeek(null, user.timeZone).formatISODateOnly(),
            endDate: getEndOfWeek(null, user.timeZone).formatISODateOnly(),
            timeZone: user.timeZone
          }
        }));
      })
    ))));

  worklogSummaryEffect$ = createEffect(() => this.actions$.pipe(
    ofType(fetchWorklogSummary),
    mergeMap((action) => this._fetchWorklogSummary(action).pipe(map((res) => this.dispatchWorklogSummary(res))))
  ));

  _fetchWorklogSummary(action) {
    this.store.dispatch(setWorklogSummaryLoadingState({ loadingState: LoadingState.Loading }))
    const url = environment.LOG_MY_WORK_SUMMARY;
    return <Observable<LogMyWorkSummary>>this.http.apiPostRequest(url, action.payload, false)
      .pipe(
        takeUntil(
          this.actions$.pipe(
            ofType(
              discardSentCallsAfterNavigate
            )
          )
        ),
        catchError(error => {
          this.store.dispatch(setWorklogSummaryLoadingState({ loadingState: LoadingState.Error }))
          return of(this.store.dispatch(fetchError()));
        })
      );
  }

  dispatchWorklogSummary(summary: LogMyWorkSummary) {
    if (summary == undefined) {
      this.trackingService.captureUserActionResult(UserActions.LogMyWork.WorkLogSummaryRequest, 'Failure');
      this.store.dispatch(setWorklogSummaryLoadingState({ loadingState: LoadingState.Error }));
      return fetchError();
    }

    this.store.dispatch(setWorklogSummary({ summary }))
    this.store.dispatch(setWorklogSummaryLoadingState({ loadingState: LoadingState.Done }));
    this.trackingService.captureUserActionResult(UserActions.LogMyWork.WorkLogSummaryRequest, 'Success');
    return dummyAction();
  }

  generateAIWorklogEffect$ = createEffect(() => this.actions$.pipe(
    ofType(generateAIWorklog),
    mergeMap((action) => {
      if (this.previousParams && JSON.stringify(this.previousParams) === JSON.stringify(action.payload)) {
        return EMPTY;
      } else {
        // this.store.dispatch(discardSentCallsAfterNavigate());
        this.cancelPreviousRequest$.next();
        return this._generateAIWorklog(action).pipe(map(res => this._dispatchAIGeneratedWorklog(res)));
      }
    })
  ));

  _generateAIWorklog(action) {
    this.store.dispatch(setGenerateAIWorklogLoadingState({ loadingState: LoadingState.Loading }));
    const url = environment.GENERATE_WORKLOG_WITH_AI;
    this.previousParams = action.payload;

    const mergedCancelObservables$ = merge(
      this.cancelPreviousRequest$,
      this.actions$.pipe(ofType(discardSentCallsAfterNavigate))
    )

    return <Observable<AIResponse>>this.http.apiPostRequest(url, action.payload, false)
      .pipe(
        takeUntil(
          mergedCancelObservables$
        ),
        finalize(() => this.previousParams = null),
        catchError(error => {
          this.previousParams = null;
          this.store.dispatch(setGenerateAIWorklogLoadingState({ loadingState: LoadingState.Error }));
          return of(this.store.dispatch(fetchError()))
        })
      );
  }

  _dispatchAIGeneratedWorklog(worklog: AIResponse) {
    this.previousParams = null;
    if (worklog == undefined) {
      this.trackingService.captureUserActionResult(UserActions.LogMyWork.GenerateAIWorkLogRequest, 'Failure');
      this.store.dispatch(setGenerateAIWorklogLoadingState({ loadingState: LoadingState.Error }));
      return fetchError();
    }

    if (worklog.errorCode) {
      this.store.dispatch(setActivityState({ activityState: { message: worklog.errorCode, errorCode: worklog.errorCode } }));
      this.store.dispatch(setGenerateAIWorklogLoadingState({ loadingState: LoadingState.Error }));
      this.trackingService.captureUserActionResult(UserActions.LogMyWork.GenerateAIWorkLogRequest, 'Failure');

      if (worklog.errorCode !== AiWorklogErrorCodes.ND006 &&
        worklog.errorCode !== AiWorklogErrorCodes.ND002 &&
        worklog.errorCode !== AiWorklogErrorCodes.ND001 &&
        worklog.errorCode !== AiWorklogErrorCodes.ND004
      ) {
        this.messageService.add({
          key: 'message',
          severity: 'error',
          summary: "Error!",
          detail: `Something went wrong please try again.`
        });
      }

      return dummyAction();
    }

    const aiGeneratedWorklogs = this._transformAiGeneratedWorklog(worklog?.data)
    this.store.dispatch(setAIGeneratedWorklog({ worklog: aiGeneratedWorklogs, uniqueIdentifier: worklog.uniqueIdentifier }));
    this.store.dispatch(setGenerateAIWorklogLoadingState({ loadingState: LoadingState.Done }));
    this.trackingService.captureUserActionResult(UserActions.LogMyWork.GenerateAIWorkLogRequest, 'Success');

    return dummyAction();
  }

  _transformAiGeneratedWorklog(worklogResponse: AIGeneratedWorklogResponse[]): AIGeneratedWorklog[] {
    let incrementor = 0;
    return worklogResponse.map(w => {
      const currentId = incrementor++;

      return {
        id: currentId,
        taskId: w.key,
        hours: w.time,
        comments: w.summary,
        taskUrl: '',
        taskTitle: w.taskTitle
      };
    });
  }

  issueIdValidityEffect$ = createEffect(() => this.actions$.pipe(
    ofType(fetchIssueIdValidity),
    mergeMap((action) => this._fetchIssueIdValidity(action).pipe(map((res) => this.dispatchIssueIdValidity(res))))
  ));

  _fetchIssueIdValidity(action) {
    this.store.dispatch(setIssueIdValidityLoadingState({ loadingState: LoadingState.Loading }));
    const url = parseParametrizedString(environment.ISSUE_ID_VALIDITY, action.issueId);

    return <Observable<IssueIdValidity>>this.http.apiGetRequest(url)
      .pipe(catchError(error => {
        this.store.dispatch(setIssueIdValidityLoadingState({ loadingState: LoadingState.Error }));
        return of(this.store.dispatch(fetchError()));
      }));
  }

  dispatchIssueIdValidity(issueIdValidity: IssueIdValidity) {
    if (issueIdValidity == undefined) {
      this.store.dispatch(setIssueIdValidityLoadingState({ loadingState: LoadingState.Error }));
      return fetchError();
    }

    this.store.dispatch(setIssueIdValidity({ issueIdValidity }));
    this.store.dispatch(setIssueIdValidityLoadingState({ loadingState: LoadingState.Done }));
    return dummyAction();
  }

  submitAIGenerateWorklog$ = createEffect(() => this.actions$.pipe(
    ofType(submitWorklogs, submitManualWorkLog),
    mergeMap((action) => this._submitAIGeneratedWorklogs(action).pipe(map((res) => this.dispatchAIGeneratedWorklogResponse(res, action))))
  ));

  submitPopupAIGenerateWorklog$ = createEffect(() => this.actions$.pipe(
    ofType(submitPopupWorklogs),
    mergeMap((action) => this._submitPopUpAIGeneratedWorklogs(action).pipe(map((res) => this.dispatchPopupAIGeneratedWorklogResponse(res, action))))
  ));

  _submitAIGeneratedWorklogs(action) {
    this.updateLoadingState(action, LoadingState.Loading);
    const url = environment.POST_AI_GENERATED_WORKLOG;
    return <Observable<AISubmittedResponse>>this.http.apiPostRequest(url, action.worklogs)
      .pipe(catchError(error => {
        this.store.dispatch(resetAIGeneratedWorklogSubmissionResponse());
        this.updateLoadingState(action, LoadingState.Error);
        return of(this.store.dispatch(fetchError()));
      }));
  }

  _submitPopUpAIGeneratedWorklogs(action) {
    this.store.dispatch(setPopupGeneratedWorklogSubmissionLoadingState({ loadingState: LoadingState.Loading }));
    const url = environment.POST_AI_GENERATED_WORKLOG;
    return <Observable<AISubmittedResponse>>this.http.apiPostRequest(url, action.worklogs)
      .pipe(catchError(error => {
        this.store.dispatch(setPopupGeneratedWorklogSubmissionLoadingState({ loadingState: LoadingState.Error }));
        return of(this.store.dispatch(fetchError()));
      }));
  }

  dispatchAIGeneratedWorklogResponse(submittedWorklogResponse: AISubmittedResponse, action: any) {
    if (submittedWorklogResponse === undefined) {
      this.updateLoadingState(action, LoadingState.Error);
      this.trackingService.captureUserActionResult(UserActions.LogMyWork.SubmitAIGeneratedWorkLogRequest, 'Failure');
      return fetchError();
    }

    const unSubmittedWorklogsCount = submittedWorklogResponse.submissionDetails.filter(w => !w.submitted).length;

    if (unSubmittedWorklogsCount > 0) {
      this.messageService.add({
        key: 'message',
        severity: 'error',
        summary: 'Error!',
        detail: 'Some of the entries were not submitted on JIRA for ' + formatDateString(action.loggedTimeDate)
      });
    }

    submittedWorklogResponse.successfullySubmittedWorklogsCount = submittedWorklogResponse.submissionDetails.length - unSubmittedWorklogsCount;

    const submittedHours = this.getLoggedHours(submittedWorklogResponse.submissionDetails);

    const loadingState = unSubmittedWorklogsCount === submittedWorklogResponse.submissionDetails.length ? LoadingState.Error : LoadingState.Done

    const mappedToWorkLogItem = submittedWorklogResponse
      .submissionDetails
      .filter(d => d.submitted)
      .map(d => ({
        workLogId: d.workLogId,
        description: d.comment,
        timeSpentInSeconds: d.hours * 3600,
        ticketId: d.ticketId
      }));

    const groupedItems = mappedToWorkLogItem.reduce((acc, item) => {
      if (!acc[item.ticketId]) {
        acc[item.ticketId] = [];
      }
      acc[item.ticketId].push(item);
      return acc;
    }, {} as Record<string, WorklogItem[]>);


    if (loadingState === LoadingState.Done) {
      const metaData = {
        date: action.loggedTimeDate,
        updatedFromEffect: true,
        data: Object.entries(groupedItems).map(([ticketId, workLogItems]) => ({
          ticketId,
          ticketDescription: action.worklogs.worklogs.find(w => w.ticketId === ticketId).ticketDescription,
          workLogItems
        }))
      }

      this.store.dispatch(submittedAIWorklogImpact({ metaData }));
    }

    this.store.dispatch(setAIGeneratedWorklogSubmissionResponse({
      submittedResponse: {
        date: action.loggedTimeDate,
        response: submittedWorklogResponse,
        submittedHoursForWorklog: submittedHours
      }
    }));

    if (action.type === submitManualWorkLog.type && loadingState !== LoadingState.Error) {
      this.store.dispatch(setManualWorklogSubmitted({ manualWorklog: true }))
      this.messageService.add({
        severity: 'success',
        summary: 'Success!',
        detail: `Your work log for ${formatDateString(action.loggedTimeDate)} has been submitted to Jira successfully.`,
        key: 'message'
      })
    } else {
      this.store.dispatch(setManualWorklogSubmitted({ manualWorklog: false }))
    }

    this.trackingService.captureUserActionResult(UserActions.LogMyWork.SubmitAIGeneratedWorkLogRequest, 'Success');
    //TODO: reset only when response is success loadingState.DONE
    //this.store.dispatch(resetAIGeneratedWorklog());
    return this.updateLoadingState(action, loadingState, false);
  }

  dispatchPopupAIGeneratedWorklogResponse(submittedWorklogResponse: AISubmittedResponse, action: any) {
    if (submittedWorklogResponse === undefined) {
      this.store.dispatch(setPopupGeneratedWorklogSubmissionLoadingState({ loadingState: LoadingState.Error }));
      this.trackingService.captureUserActionResult(UserActions.LogMyWork.SubmitAIGeneratedWorkLogRequest, 'Failure');
      return fetchError();
    }

    const unSubmittedWorklogsCount = submittedWorklogResponse.submissionDetails.filter(w => !w.submitted).length;

    if (unSubmittedWorklogsCount > 0) {
      this.messageService.add({
        key: 'message',
        severity: 'error',
        summary: 'Error!',
        detail: 'Some of the entries were not submitted on JIRA for ' + formatDateString(action.loggedTimeDate)
      });
    }

    submittedWorklogResponse.successfullySubmittedWorklogsCount = submittedWorklogResponse.submissionDetails.length - unSubmittedWorklogsCount;

    const submittedHours = this.getLoggedHours(submittedWorklogResponse.submissionDetails);

    const loadingState = unSubmittedWorklogsCount === submittedWorklogResponse.submissionDetails.length ? LoadingState.Error : LoadingState.Done

    const mappedToWorkLogItem = submittedWorklogResponse
      .submissionDetails
      .filter(d => d.submitted)
      .map(d => ({
        workLogId: d.workLogId,
        description: d.comment,
        timeSpentInSeconds: d.hours * 3600,
        ticketId: d.ticketId
      }));

    const groupedItems = mappedToWorkLogItem.reduce((acc, item) => {
      if (!acc[item.ticketId]) {
        acc[item.ticketId] = [];
      }
      acc[item.ticketId].push(item);
      return acc;
    }, {} as Record<string, WorklogItem[]>);


    if (loadingState === LoadingState.Done) {
      const metaData = {
        date: action.loggedTimeDate,
        updatedFromEffect: true,
        data: Object.entries(groupedItems).map(([ticketId, workLogItems]) => ({
          ticketId,
          ticketDescription: action.worklogs.worklogs.find(w => w.ticketId === ticketId).ticketDescription,
          workLogItems
        }))
      }

      this.store.dispatch(submittedAIWorklogImpact({ metaData }));
    }

    this.store.dispatch(setAIGeneratedWorklogSubmissionResponse({
      submittedResponse: {
        date: action.loggedTimeDate,
        response: submittedWorklogResponse,
        submittedHoursForWorklog: submittedHours
      }
    }));

    if (action.manual && loadingState !== LoadingState.Error) {
      this.store.dispatch(setManualWorklogSubmitted({ manualWorklog: true }))
      this.messageService.add({
        severity: 'success',
        summary: 'Success!',
        detail: `Your work log for ${formatDateString(action.loggedTimeDate)} has been submitted to Jira successfully.`,
        key: 'message'
      })
    } else {
      this.store.dispatch(setManualWorklogSubmitted({ manualWorklog: false }))
    }

    this.trackingService.captureUserActionResult(UserActions.LogMyWork.SubmitAIGeneratedWorkLogRequest, 'Success');

    return setPopupGeneratedWorklogSubmissionLoadingState({ loadingState });
  }

  getLoggedHours(worklogTickets: AISubmittedWorklogTickets[]): number {
    if (!worklogTickets) return 0;
    worklogTickets = worklogTickets.filter(w => w.submitted);
    if (worklogTickets.length > 0) {
      return +worklogTickets.reduce((total, worklog) => total + worklog.hours, 0).toFixed(2);
    }

    return 0;
  }

  updateWorkingHourPerDayConfigEffect$ = createEffect(() =>
    this.actions$.pipe(
      ofType(updateWorkingHourPerDayConfig),
      mergeMap((props) =>
        this._updateWorkingHourPerDayConfig(props).pipe(
          map((response) => this.dispatchUpdateWorkingHourPerDayConfig(props.propValue, response))
        )
      )
    )
  );


  private _updateWorkingHourPerDayConfig = (prop) => {
    this.store.dispatch(WorkingHourPerDayConfigLoadingState({ loadingState: LoadingState.Loading }));
    return this.http.apiPostRequest(environment.UPSERT_CONFIG, prop, false).pipe(
      catchError(() => {
        this.messageService.clear('message');
        this.messageService.clear('network');
        this.messageService.add({
          severity: 'error',
          summary: "Error!",
          detail: "Changes could not be saved.",
          key: 'message'
        });
        this.store.dispatch(WorkingHourPerDayConfigLoadingState({ loadingState: LoadingState.Error }));
        return of(this.store.dispatch(fetchError()));
      })
    );
  };

  private dispatchUpdateWorkingHourPerDayConfig = (hoursPerDay, response) => {
    if (!response) {
      this.store.dispatch(WorkingHourPerDayConfigLoadingState({ loadingState: LoadingState.Error }));
      return fetchError();
    }

    this.store.dispatch(WorkingHourPerDayConfigLoadingState({ loadingState: LoadingState.Done }));
    this.messageService.clear('message');
    this.messageService.add({
      severity: 'success',
      summary: 'Success!',
      detail: 'Changes were saved successfully.',
      key: 'message'
    });
    this.store.dispatch(updateWorklogConfigPerDayForLMW({ hoursPerDay }))
    return dummyAction();
  }


  editWorklog$ = createEffect(() => this.actions$.pipe(
    ofType(editWorklogs),
    mergeMap((action) => this._submitEditWorkLogRequest(action).pipe(map((res) => this._dispatchEditWorkLogs(res))))
  ));

  _submitEditWorkLogRequest(action) {
    this.store.dispatch(setEditWorkLogLoadingState({ loadingState: LoadingState.Loading }))
    const url = environment.EDIT_WORKLOG;
    return <Observable<AISubmittedResponse>>this.http.apiPostRequest(url, action.workLogs)
      .pipe(catchError(error => {
        this.store.dispatch(setEditWorkLogLoadingState({ loadingState: LoadingState.Error }))
        return of(this.store.dispatch(fetchError()));
      }));
  }

  _dispatchEditWorkLogs(editedWorkLogs: AISubmittedResponse) {
    if (editedWorkLogs === undefined) {
      this.store.dispatch(setEditWorkLogLoadingState({ loadingState: LoadingState.Error }));
      return fetchError();
    }

    const nonEditedWorkLogsCount = editedWorkLogs.submissionDetails.filter(w => !w.submitted).length;
    if (nonEditedWorkLogsCount > 0) {
      this.messageService.add({
        key: 'message',
        severity: 'error',
        summary: 'Error!',
        detail: 'Some of the entries were not updated on Jira.'
      });
    }
    else {
      this.messageService.add({
        key: 'message',
        severity: 'success',
        summary: 'Success!',
        detail: 'Work log updated successfully'
      });
    }

    this.store.dispatch(setEditWorkLogLoadingState({
      loadingState:
        nonEditedWorkLogsCount === editedWorkLogs.submissionDetails.length ?
          LoadingState.Error :
          LoadingState.Done
    }));

    editedWorkLogs.successfullySubmittedWorklogsCount = editedWorkLogs.submissionDetails.length - nonEditedWorkLogsCount;

    return setEditWorkLogResponse({ editedWorkLogs });
  }

  deleteWorkLogs$ = createEffect(() => this.actions$.pipe(
    ofType(deleteWorklogs),
    mergeMap((action) => this._submitDeleteWorkLogRequest(action).pipe(map((res) => this._dispatchDeleteWorkLogResponse(res))))
  ));

  _submitDeleteWorkLogRequest(action) {
    this.store.dispatch(setDeleteWorkLogLoadingState({ loadingState: LoadingState.Loading }))
    const url = environment.DELETE_WORKLOG;
    return <Observable<DeletionResponse>>this.http.apiPostRequest(url, action.workLogs)
      .pipe(catchError(error => {
        this.store.dispatch(setDeleteWorkLogLoadingState({ loadingState: LoadingState.Error }))
        return of(this.store.dispatch(fetchError()));
      }));
  }

  _dispatchDeleteWorkLogResponse(response: DeletionResponse) {
    if (response === undefined) {
      this.store.dispatch(setDeleteWorkLogLoadingState({ loadingState: LoadingState.Error }));
      return fetchError();
    }

    const notDeletedItems = response.deletionDetails.filter(w => !w.deleted).length;

    if (notDeletedItems > 0) {
      this.messageService.add({
        key: 'message',
        severity: 'error',
        summary: 'Error!',
        detail: 'Some of the entries were not deleted on Jira.'
      });
    } else {
      this.messageService.add({
        key: 'message',
        severity: 'success',
        summary: 'Success',
        detail: 'Work log deleted successfully'
      });
    }

    this.store.dispatch(setDeleteWorkLogLoadingState({
      loadingState:
        notDeletedItems === response.deletionDetails.length ?
          LoadingState.Error :
          LoadingState.Done
    }));

    response.successfullyDeletedWorkLogsCount = response.deletionDetails.length - notDeletedItems;
    return setDeleteWorkLogResponse({ response });
  }

  updateLoadingState(action, loadingState: LoadingState, dispatchAction: boolean = true) {
    let actionToBeDispatched = null
    switch (action.type) {
      case submitWorklogs.type:
        actionToBeDispatched = setAIGeneratedWorklogSubmissionLoadingState({ loadingState });
        break;
      case submitManualWorkLog.type:
        actionToBeDispatched = setManualWorkLogLoadingState({ loadingState });
        break;
      default:
        console.warn("Unknown action type");
    }
    if (!actionToBeDispatched) return;

    if (dispatchAction) {
      this.store.dispatch(actionToBeDispatched);
    } else {
      return actionToBeDispatched;
    }
  }

  pingAiCachePrompt$ = createEffect(() => this.actions$.pipe(
    ofType(pingAiCachePrompt),
    mergeMap((action) => this.pingAiCachePromptRequest(action).pipe(map((res) => this.pingAiCachePromptResponse(res))))
  ));

  pingAiCachePromptRequest(action) {
    const url = environment.PING_AI_CACHE_PROMPT;
    return this.http.apiGetRequest<string>(url)
      .pipe(catchError(error => {
        return of(fetchError());
      }));
  }

  pingAiCachePromptResponse(response) {
    const responseCode = response && response.PROMPT_CACHED ? 200 : 500;
    return setPingAiCachePromptResponse({ responseCode });
  }

  /*** Weekly Worklog Summary ***/
  fetchWeeklyWorklogSummaryEffect$ = createEffect(() =>
    this.actions$.pipe(
      ofType(fetchWeeklyWorklogSummary),
      mergeMap(({ dateRange }) => this.fetchWeeklyWorklogSummary(dateRange).pipe(map((response) => this.dispatchWeeklyWorklogSummary({ response, dateRange }))))
    )
  );

  fetchWeeklyWorklogSummary([start, end]: [Date, Date]) {
    this.store.dispatch(setWeeklyWorklogSummaryLoadingState({ loading: LoadingState.Loading }));
    this.trackingService.captureUserAction(UserActions.LogMyWork.WorklogInsightsRequest);

    const url = environment.GENERATE_WORKLOG_SUMMARY_WITH_AI;
    const dateRange = [start.formatISODateOnly(), end.formatISODateOnly()]

    return <Observable<{ message: string; summary: string; }>>this.http.apiPostRequest(url, { dateRange }, false).pipe(
      takeUntil(this.actions$.pipe(ofType(discardSentCallsAfterNavigate))),
      catchError((error) => {
        this.store.dispatch(setWeeklyWorklogSummaryLoadingState({ loading: LoadingState.Error }))
        return of(this.store.dispatch(fetchError()));
      })
    );
  }

  dispatchWeeklyWorklogSummary({ dateRange, response }) {
    if (response === undefined) {
      this.store.dispatch(setWeeklyWorklogSummaryLoadingState({ loading: LoadingState.Error }));
      this.trackingService.captureUserActionResult(UserActions.LogMyWork.WorklogInsightsRequest, 'Failure');

      return fetchError();
    }

    const instanceId = getCurrentInstance();
    response = { ...response, dateRange, instanceId };
    this.store.dispatch(setWeeklyWorklogSummaryLoadingState({ loading: LoadingState.Done }));
    this.trackingService.captureUserActionResult(UserActions.LogMyWork.WorklogInsightsRequest, 'Success');

    return setWeeklyWorklogSummary({ response });
  }

  /*** Fetch Daily Scrum Updates ***/
  fetchDailyScrumUpdatesEffect$ = createEffect(() =>
    this.actions$.pipe(
      ofType(fetchDailyScrumUpdates),
      mergeMap(({ instanceId, instanceUserId, dates }) => this.fetchDailyScrumUpdates(instanceId, instanceUserId, dates).pipe(map((response) => this.dispatchFetchDailyScrumUpdates({ instanceId, response, dates }))))
    )
  );

  fetchDailyScrumUpdates(instanceId: string, instanceUserId: string, dates: DailyScrumDates) {
    this.store.dispatch(fetchDailyScrumUpdatesLoadingState({ loading: LoadingState.Loading }));
    this.trackingService.captureUserAction(UserActions.LogMyWork.ScrumUpdate.Generate);
    const fetchGeneratedDailyScrumUpdatesUrl = environment.GENERATE_DAILY_SCRUM_UPDATES_WITH_AI;
    const todayDate = dates.todayDate.formatISODateOnly();
    const yesterdayDate = dates.yesterdayDate.formatISODateOnly();

    return this.http.apiPostRequest<DailyScrumUpdates>(fetchGeneratedDailyScrumUpdatesUrl, { todayDate, yesterdayDate }, false).pipe(
      takeUntil(this.actions$.pipe(ofType(cancelDailyScrumUpdates))),
      catchError((error) => {
        this.store.dispatch(fetchDailyScrumUpdatesLoadingState({ loading: LoadingState.Error }));
        return of(this.store.dispatch(fetchError()));
      })
    );
  }

  dispatchFetchDailyScrumUpdates({ instanceId, dates, response }: { instanceId: string; response: DailyScrumUpdates | void; dates: DailyScrumDates }) {
    if (response === undefined) {
      this.store.dispatch(fetchDailyScrumUpdatesLoadingState({ loading: LoadingState.Error }));
      this.trackingService.captureUserActionResult(UserActions.LogMyWork.ScrumUpdate.Generate, 'Failure');

      return fetchError();
    }

    const dailyScrumUpdatesResponse = {
      ...response,
      dates,
      instanceId,
      isSavedDailyScrumUpdate: false,
      isSavedDailyScrumUpdateAvailable: false,
      updatedAt: new Date(),
    } as DailyScrumUpdates;

    this.store.dispatch(fetchDailyScrumUpdatesLoadingState({ loading: LoadingState.Done }));
    this.trackingService.captureUserActionResult(UserActions.LogMyWork.ScrumUpdate.Generate, 'Success');

    return setDailyScrumUpdates({ response: dailyScrumUpdatesResponse });
  }

  /*** Save Daily Scrum Updates ***/
  upsertDailyScrumUpdatesEffect$ = createEffect(() =>
    this.actions$.pipe(
      ofType(upsertDailyScrumUpdates),
      mergeMap(({ data }) => this.upsertDailyScrumUpdates(data).pipe(map((response) => this.dispatchUpsertDailyScrumUpdates({ response }))))
    )
  );

  upsertDailyScrumUpdates(updates: DailyScrumUpdates) {
    this.store.dispatch(upsertDailyScrumUpdatesLoadingState({ loading: LoadingState.Loading }));
    this.trackingService.captureUserAction(UserActions.LogMyWork.ScrumUpdate.Save);

    const url = environment.UPSERT_DAILY_SCRUM_UPDATES;
    const { last_day, current_day, blockers } = updates;

    const bodyContent = { last_day, current_day, blockers };

    const data = {
      date: updates.dates.todayDate.formatISODateOnly(),
      body: JSON.stringify(bodyContent),
    };

    return <Observable<any>>this.http.apiPostRequest(url, data, false).pipe(
      takeUntil(this.actions$.pipe(ofType(cancelDailyScrumUpdates))),
      catchError((error) => {
        this.store.dispatch(upsertDailyScrumUpdatesLoadingState({ loading: LoadingState.Error }));
        return of(this.store.dispatch(fetchError()));
      })
    );
  }

  dispatchUpsertDailyScrumUpdates({ response }: { response: SavedDailyScrumUpdate }) {
    if (response === undefined) {
      this.store.dispatch(upsertDailyScrumUpdatesLoadingState({ loading: LoadingState.Error }));
      this.trackingService.captureUserActionResult(UserActions.LogMyWork.ScrumUpdate.Save, 'Failure');

      this.messageService.add({
        key: 'message',
        severity: 'error',
        summary: "Error!",
        detail: `Your daily scrum update was not saved. Please try again later.`
      });

      return fetchError();
    }

    this.store.dispatch(upsertDailyScrumUpdatesLoadingState({ loading: LoadingState.Done }));
    this.trackingService.captureUserActionResult(UserActions.LogMyWork.ScrumUpdate.Save, 'Success');

    this.messageService.add({
      key: 'message',
      severity: 'success',
      summary: "Success!",
      detail: `Your daily scrum update saved successfully.`
    });

    return dummyAction();
  }

  /*** Fetch Saved Daily Scrum Updates ***/
  fetchSavedDailyScrumUpdatesEffect$ = createEffect(() =>
    this.actions$.pipe(
      ofType(fetchSavedDailyScrumUpdates),
      mergeMap(({ instanceId, instanceUserId, dates }) => this.fetchSavedDailyScrumUpdates(instanceId, instanceUserId, dates).pipe(map((response) => this.dispatchFetchSavedDailyScrumUpdates({ instanceId, response, dates }))))
    )
  );

  fetchSavedDailyScrumUpdates(instanceId: string, instanceUserId: string, dates: DailyScrumDates) {
    this.store.dispatch(fetchDailyScrumUpdatesLoadingState({ loading: LoadingState.Loading }));
    this.trackingService.captureUserAction(UserActions.LogMyWork.ScrumUpdate.FetchSaved);

    const fetchSavedDailyScrumUpdatesUrl = environment.FETCH_SAVED_DAILY_SCRUM_UPDATES(
      instanceId,
      instanceUserId,
      dates.yesterdayDate,
      dates.todayDate,
    );

    return this.http.apiGetRequest<SavedDailyScrumUpdate[]>(fetchSavedDailyScrumUpdatesUrl).pipe(
      takeUntil(this.actions$.pipe(ofType(cancelDailyScrumUpdates))),
      catchError((error) => {
        this.store.dispatch(fetchDailyScrumUpdatesLoadingState({ loading: LoadingState.Error }));
        return of(this.store.dispatch(fetchError()));
      })
    );
  }

  dispatchFetchSavedDailyScrumUpdates({ instanceId, dates, response }: { instanceId: string; response: SavedDailyScrumUpdate[] | void; dates: DailyScrumDates }) {
    if (response === undefined) {
      this.store.dispatch(fetchDailyScrumUpdatesLoadingState({ loading: LoadingState.Error }));
      this.trackingService.captureUserActionResult(UserActions.LogMyWork.ScrumUpdate.FetchSaved, 'Failure');

      return fetchError();
    }
    response = response || [];
    response = response.map(r => ({ ...r, updatedAt: Math.round(r.updatedAt * 1000) }));
    this.store.dispatch(setSavedDailyScrumUpdates({ response }));
    const dailyScrumUpdatesResponse = this.parseSavedDailyScrumUpdates(response, dates, instanceId);
    this.store.dispatch(fetchDailyScrumUpdatesLoadingState({ loading: LoadingState.Done }));
    this.trackingService.captureUserActionResult(UserActions.LogMyWork.ScrumUpdate.FetchSaved, 'Success');

    return setDailyScrumUpdates({ response: dailyScrumUpdatesResponse });
  }

  parseSavedDailyScrumUpdates(response: SavedDailyScrumUpdate[] | void, dates: DailyScrumDates, instanceId: string): DailyScrumUpdates {
    let dailyScrumUpdatesResponse: DailyScrumUpdates;

    if (response && Array.isArray(response) && response.length > 0) {
      const { last_day, current_day, blockers } = JSON.parse(response[0].body || '{}');
      dailyScrumUpdatesResponse = {
        message: 'Fetched saved daily scrum updates',
        last_day: filterNbspFromHtml(last_day),
        current_day: filterNbspFromHtml(current_day),
        blockers: filterNbspFromHtml(blockers),
        dates: {
          todayDate: dates.todayDate,
          yesterdayDate: dates.yesterdayDate
        },
        instanceId,
        isSavedDailyScrumUpdate: true,
        isSavedDailyScrumUpdateAvailable: true,
        updatedAt: new Date(response[0].updatedAt),
      };
    } else {
      dailyScrumUpdatesResponse = {
        message: 'No saved daily scrum updates found',
        last_day: '',
        current_day: '',
        blockers: '',
        dates: {
          todayDate: dates.todayDate,
          yesterdayDate: dates.yesterdayDate
        },
        instanceId,
        isSavedDailyScrumUpdate: true,
        isSavedDailyScrumUpdateAvailable: false,
        updatedAt: null,
      };
    }

    return dailyScrumUpdatesResponse;
  }

  /*** Fetch Team Scrum Updates (without user context) ***/
  fetchTeamScrumUpdatesEffect$ = createEffect(() =>
    this.actions$.pipe(
      ofType(fetchTeamScrumUpdates),
      mergeMap(({ instanceId, dates }) => this.fetchTeamScrumUpdates(instanceId, dates).pipe(map((response) => this.dispatchFetchTeamScrumUpdates({ instanceId, response, dates }))))
    )
  );

  fetchTeamScrumUpdates(instanceId: string, dates: DailyScrumDates) {
    this.store.dispatch(fetchDailyScrumUpdatesLoadingState({ loading: LoadingState.Loading }));
    this.trackingService.captureUserAction(UserActions.LogMyWork.ScrumUpdate.FetchSaved);

    const fetchTeamScrumUpdatesUrl = environment.FETCH_TEAM_SCRUM_UPDATES(
      instanceId,
      dates.yesterdayDate,
      dates.todayDate,
    );

    return this.http.apiGetRequest<SavedDailyScrumUpdate[]>(fetchTeamScrumUpdatesUrl).pipe(
      takeUntil(this.actions$.pipe(ofType(cancelDailyScrumUpdates))),
      catchError((error) => {
        this.store.dispatch(fetchDailyScrumUpdatesLoadingState({ loading: LoadingState.Error }));
        return of(this.store.dispatch(fetchError()));
      })
    );
  }

  dispatchFetchTeamScrumUpdates({ instanceId, dates, response }: { instanceId: string; response: SavedDailyScrumUpdate[] | void; dates: DailyScrumDates }) {
    if (response === undefined) {
      this.store.dispatch(fetchDailyScrumUpdatesLoadingState({ loading: LoadingState.Error }));
      this.trackingService.captureUserActionResult(UserActions.LogMyWork.ScrumUpdate.FetchSaved, 'Failure');

      return fetchError();
    }
    response = response || [];
    response = response.map(r => ({ ...r, updatedAt: Math.round(r.updatedAt * 1000) }));
    this.store.dispatch(setSavedDailyScrumUpdates({ response }));
    this.store.dispatch(fetchDailyScrumUpdatesLoadingState({ loading: LoadingState.Done }));
    this.trackingService.captureUserActionResult(UserActions.LogMyWork.ScrumUpdate.FetchSaved, 'Success');

    return dummyAction();
  }
}
