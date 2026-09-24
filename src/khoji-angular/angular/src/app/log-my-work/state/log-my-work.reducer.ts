import { Action, createReducer, on } from "@ngrx/store";
import { convertDateToISO, getCurrentInstance } from "app/shared/helper-functions";
import { AILogMyWorkSummaryData, AISubmittedResponse, DeletionResponse, LogMyWork, LogMyWorkSummary, SelectedTicketDetails, TicketWorklogData } from "app/states/app-states";
import { clearStatesForLoginPage, updateWorklogConfigPerDayForLMW } from "app/states/app.actions";
import { LoggedTimePerDay } from './../../states/app-states';
import { addEmptyWorklogForTicket, resetAIGeneratedWorklog, resetAIGeneratedWorklogSubmissionResponse, resetAIWorklogSummaryData, setActivityState, setAIGeneratedWorklog, setAIGeneratedWorklogSubmissionResponse, setAIWorklogSummaryData, setDailyScrumDates, setDailyScrumUpdates, setDeleteWorkLogResponse, setEditWorkLogResponse, setInstanceUserMetaData, setIssueIdValidity, setManualWorkLogModalState, setManualWorklogSubmitted, setPingAiCachePromptResponse, setSavedDailyScrumUpdates, setSelectedTicketDetails, setWeeklyWorklogSummary, setWeeklyWorklogSummaryDates, setWorklogSummary, submittedAIWorklogImpact } from "./log-my-work.action";
import { setUserPreferenceUpdated } from "app/admin/state/admin.actions";

const submittedAIResponse = {
  submissionDetails: [],
  successfullySubmittedWorklogsCount: 0
}

const defaultLogMyWorkState: LogMyWork = {
  instanceUser: {
    instanceId: '',
    calendarIntegration: false,
    calendarTokenValid: false,
    accountId: '',
    name: '',
    timeZone: '',
    userPreferences: undefined
  },
  summary: {
    loggedTimePerDay: [],
    totalAvailableSeconds: 0,
    totalLoggedTimeInSeconds: 0,
    workLogHoursPerDayConfig: 0,
    worklogPercentage: 0,
    thresholdColors: {},
    thresholdPercentage: {},
    updatedFromEffect: false
  },
  aiGeneratedWorklog: [{
    id: 0,
    taskId: '',
    hours: 0,
    comments: ''
  }],
  uniqueIdentifier: '',
  activityState: {
    message: "",
    errorCode: ""
  },
  issueIdValidity: {
    id: '',
    valid: false
  },
  summaryData: {
    accountId: '',
    hours: 0,
    date: new Date().formatISODateOnly(),
  },
  submittedWorklogResponse: {
    date: '',
    submittedHoursForWorklog: 0,
    response: submittedAIResponse
  },
  edittedWorkLogsResponse: {
    submissionDetails: [],
    successfullySubmittedWorklogsCount: 0
  },
  selectedTicketDetails: {
    ticketId: '',
    ticketDescription: '',
    date: ''
  },
  manualWorklogSubmitted: false,
  manualWorkLogModal: {
    date: '',
    showModal: false,
    markAsLeave: false
  },
  pingAiCachePromptResult: {
    time: null,
    responseCode: 0,
  },
  userPreferencesUpdated: 0,
  weeklyWorklogSummary: {
    message: '',
    summary: '',
    dateRange: [null, null],
    instanceId: 0,
  },
  weeklyWorklogSummaryDateRange: [null, null],
  dailyScrumUpdates: {
    message: '',
    current_day: '',
    last_day: '',
    blockers: '',
    dates: {
      todayDate: null,
      yesterdayDate: null,
    },
    instanceId: '',
    isSavedDailyScrumUpdate: false,
    isSavedDailyScrumUpdateAvailable: false,
    updatedAt: null,
  },
  dailayScrumDates: {
    todayDate: null,
    yesterdayDate: null,
  },
  savedDailyScrumUpdates: []
}

const _logMyWork = createReducer(
  defaultLogMyWorkState,
  on(setInstanceUserMetaData, (state, { user }) => {
    const instanceId = getCurrentInstance();
    const { accountId, calendarIntegration, calendarTokenValid, name, timeZone, userPreferences } = user;
    return {
      ...state,
      instanceUser: {
        name,
        instanceId,
        accountId,
        calendarIntegration,
        calendarTokenValid,
        timeZone: timeZone ?? 'UTC', // 'UTC' if timeZone is null or undefined
        userPreferences
      }
    };
  }),
  on(setWorklogSummary, (state, { summary }) => {
    return {
      ...state,
      summary
    };
  }),
  on(setAIGeneratedWorklog, (state, { worklog, uniqueIdentifier }) => {
    return {
      ...state,
      aiGeneratedWorklog: worklog,
      uniqueIdentifier: uniqueIdentifier
    }
  }),
  on(resetAIGeneratedWorklog, (state) => {
    return {
      ...state,
      aiGeneratedWorklog: [],
      uniqueIdentifier: ''
    }
  }),
  on(setActivityState, (state, { activityState }) => {
    return {
      ...state,
      activityState: activityState
    }
  }),
  on(setIssueIdValidity, (state, { issueIdValidity }) => {
    return {
      ...state,
      issueIdValidity
    }
  }),
  on(setAIWorklogSummaryData, (state, { summaryData }) => {
    return {
      ...state,
      summaryData
    }
  }),
  on(resetAIWorklogSummaryData, (state) => {
    return {
      ...state,
      summaryData: {
        ...state.summaryData,
        accountId: ''
      }
    }
  }),
  on(setAIGeneratedWorklogSubmissionResponse, (state, { submittedResponse }) => {
    return {
      ...state,
      submittedWorklogResponse: submittedResponse
    }
  }),
  on(setEditWorkLogResponse, (state, { editedWorkLogs }) => {
    const updatedData = updateWorklogs(state.selectedTicketDetails, state.summary, editedWorkLogs, state.summaryData);
    return {
      ...state,
      summary: updatedData.updatedSummary,
      summaryData: updatedData.summaryData
    };
  }),
  on(resetAIGeneratedWorklogSubmissionResponse, (state) => ({ ...state, submittedWorklogResponse: defaultLogMyWorkState.submittedWorklogResponse })),
  on(submittedAIWorklogImpact, (state, { metaData }) => {
    let copyArray = [...metaData.data];
    const updatedLoggedTimePerDay = state.summary.loggedTimePerDay.map(day => {
      if (day.date === convertDateToISO(metaData.date)) {
        const data: TicketWorklogData[] = day.data.map(d => {
          const foundItemIndex = copyArray.findIndex(item => item.ticketId === d.ticketId);
          if (foundItemIndex !== -1) {
            let item = {
              ticketId: d.ticketId,
              ticketDescription: d.ticketDescription,
              workLogItems: [
                ...d.workLogItems,
                ...copyArray[foundItemIndex].workLogItems
              ]
            };
            copyArray.splice(foundItemIndex, 1);
            return item;
          }
          return d;
        });

        return {
          ...day,
          data: [
            ...data,
            ...copyArray
          ]
        };
      }
      return day;
    });

    const newTotalLoggedTimeInSeconds = updatedLoggedTimePerDay.reduce(
      (acc, day) =>
        acc + day.data.reduce(
          (ticketAcc, ticket) =>
            ticketAcc + ticket.workLogItems?.reduce(
              (worklogAcc, worklog) => worklogAcc + worklog.timeSpentInSeconds,
              0
            ),
          0
        ),
      0
    );


    const newWorklogPercentage = (newTotalLoggedTimeInSeconds / state.summary.totalAvailableSeconds) * 100;

    const timeLoggedInSecondsForSelectedDate = updatedLoggedTimePerDay.find(w => w.date === convertDateToISO(metaData.date))
      .data
      .flatMap(w => w.workLogItems)
      .reduce((total, wkItems) => total + wkItems.timeSpentInSeconds, 0);

    let updatedSummaryData = state.summaryData;

    if (state.summaryData.date === convertDateToISO(metaData.date)) {
      updatedSummaryData = {
        ...updatedSummaryData,
        hours: state.summary.workLogHoursPerDayConfig - +(timeLoggedInSecondsForSelectedDate / 3600).toFixed(2),
        accountId: '',
      }
    }

    return {
      ...state,
      summary: {
        ...state.summary,
        loggedTimePerDay: updatedLoggedTimePerDay,
        totalLoggedTimeInSeconds: newTotalLoggedTimeInSeconds,
        worklogPercentage: newWorklogPercentage,
        updatedFromEffect: metaData.updatedFromEffect
      },
      summaryData: updatedSummaryData
    };
  }),
  on(updateWorklogConfigPerDayForLMW, (state, { hoursPerDay }) => {
    const loggedTimePerDay = state.summary.loggedTimePerDay.find((day) => day.date === state.summaryData.date);
    let remainingHours = state.summaryData.hours;

    if (loggedTimePerDay) {
      const numberOfSecondsHourForDate = loggedTimePerDay.data.flatMap((w) => w.workLogItems).reduce((total, wk) => total + wk.timeSpentInSeconds, 0);
      remainingHours = hoursPerDay - +(numberOfSecondsHourForDate / 3600).toFixed(2);
    }

    return {
      ...state,
      summary: { ...state.summary, workLogHoursPerDayConfig: hoursPerDay },
      summaryData: {
        ...state.summaryData,
        accountId: '',
        hours: remainingHours
      }
    };
  }),
  on(setSelectedTicketDetails, (state, { ticketDetails }) => {
    return {
      ...state,
      selectedTicketDetails: ticketDetails
    };
  }),
  on(setManualWorklogSubmitted, (state, { manualWorklog }) => {
    return {
      ...state,
      manualWorklogSubmitted: manualWorklog
    };
  }),
  on(setDeleteWorkLogResponse, (state, { response }) => {
    const updatedState = deleteWorklogs(state.selectedTicketDetails, state.summary, response, state.summaryData)
    return {
      ...state,
      summary: updatedState.updatedSummary,
      summaryData: updatedState.summaryData
    };
  }),
  on(clearStatesForLoginPage, () => ({ ...defaultLogMyWorkState })),
  on(setManualWorkLogModalState, (state, { manualWorkLogState }) => ({ ...state, manualWorkLogModal: manualWorkLogState })),
  on(setPingAiCachePromptResponse, (state, { responseCode }) => ({
    ...state, pingAiCachePromptResult: {
      time: new Date(),
      responseCode,
    }
  })),
  on(setUserPreferenceUpdated, (state, { time, leavesTicketId }) => ({
    ...state,
    userPreferencesUpdated: time,
    ...(leavesTicketId !== undefined && state.instanceUser
      ? {
          instanceUser: {
            ...state.instanceUser,
            userPreferences: {
              ...state.instanceUser.userPreferences,
              LEAVES: leavesTicketId
            }
          }
        }
      : {})
  })),
  on(addEmptyWorklogForTicket, (state, { date, ticketId, ticketType, ticketDescription }) => ({
    ...state,
    summary: {
      ...state.summary,
      loggedTimePerDay: [
        ...state.summary.loggedTimePerDay.map((dayLog) => ({
          ...(dayLog.date === date ? { date, data: [...dayLog.data, { ticketId, ticketType, ticketDescription, workLogItems: [] }] } : dayLog)
        }))
      ]
    }
  })),
  on(setWeeklyWorklogSummary, (state, { response }) => ({ ...state, weeklyWorklogSummary: response })),
  on(setWeeklyWorklogSummaryDates, (state, { dateRange }) => ({ ...state, weeklyWorklogSummaryDateRange: dateRange })),
  on(setDailyScrumUpdates, (state, { response }) => ({ ...state, dailyScrumUpdates: response })),
  on(setSavedDailyScrumUpdates, (state, { response }) => ({ ...state, savedDailyScrumUpdates: response })),
  on(setDailyScrumDates, (state, { dates }) => ({ ...state, dailayScrumDates: dates })),
)


export function logMyWorkReducer(state: LogMyWork, action: Action) {
  return _logMyWork(state, action);
}


function deleteWorklogs(
  selectedTicketDetails: SelectedTicketDetails,
  summary: LogMyWorkSummary,
  response: DeletionResponse,
  summaryData: AILogMyWorkSummaryData
) {

  let loggedTimePerDay = summary.loggedTimePerDay;

  const ticketId = selectedTicketDetails.ticketId;
  const worklogIdsToDelete = response.deletionDetails
    .filter(detail => detail.deleted)
    .map(detail => detail.workLogId);

  // Clone and update `loggedTimePerDay` with filtered worklog items
  let updatedLoggedTimePerDay = loggedTimePerDay.map(dayLog => {
    // Only process the day that matches the selected ticket's date
    if (dayLog.date === selectedTicketDetails.date) {
      return {
        ...dayLog,
        data: dayLog.data.map(worklog => {
          if (worklog.ticketId === ticketId) {
            // Filter out worklog items with matching `workLogId`
            const filteredWorkLogItems = worklog.workLogItems.filter(
              item => !worklogIdsToDelete.includes(item.workLogId)
            );

            return { ...worklog, workLogItems: filteredWorkLogItems };
          }
          return worklog;
        }).filter(wk => wk.workLogItems.length > 0) //filtering tickets for a day if items array is empty
      };
    }
    return dayLog;
  });

  //checking if there is no remaining worklog then delete that ticket
  const remainingWorklogsAgainstTicket = updatedLoggedTimePerDay.flatMap(dayLog => dayLog.data)
    .filter(w => w.ticketId === ticketId)
    .flatMap(w => w.workLogItems);

  if (remainingWorklogsAgainstTicket.length === 0) {
    updatedLoggedTimePerDay = updatedLoggedTimePerDay.map(wk => {
      return { ...wk, data: wk.data.filter(w => w.ticketId !== ticketId) };
    });
  }

  const { timeLoggedInSeconds, worklogPercentage } = calculateTotalLoggedTimeInSeconds(updatedLoggedTimePerDay, summary.totalAvailableSeconds);

  return {
    updatedSummary: {
      ...summary,
      loggedTimePerDay: updatedLoggedTimePerDay,
      totalLoggedTimeInSeconds: timeLoggedInSeconds,
      worklogPercentage: worklogPercentage
    },
    summaryData: updateSummaryData(selectedTicketDetails, summaryData, summary.workLogHoursPerDayConfig, updatedLoggedTimePerDay)
  };
}

function updateWorklogs(
  selectedTicketDetails: SelectedTicketDetails,
  summary: LogMyWorkSummary,
  response: AISubmittedResponse,
  summaryData: AILogMyWorkSummaryData
) {

  let loggedTimePerDay = summary.loggedTimePerDay;

  const ticketId = selectedTicketDetails.ticketId;
  const worklogIdsToUpdate = response.submissionDetails
    .filter(t => t.submitted)
    .map(t => t.workLogId);

  const updatedLoggedTimePerDay = loggedTimePerDay.map(dayLog => {
    if (dayLog.date == selectedTicketDetails.date) {

      const worklogTickets = dayLog.data.map(t => t.ticketId);

      //adding new worklog item
      if (!worklogTickets.includes(ticketId)) {
        return {
          ...dayLog,
          data: addWorklog(dayLog.data, response, ticketId, selectedTicketDetails.ticketDescription)
        }
      }
      else {
        return {
          ...dayLog,
          data: dayLog.data.map(worklog => {
            if (worklog.ticketId === ticketId) {
              worklog = { ...worklog };

              //in case of worklog is newely added
              if (!worklog.workLogItems.map(wk => wk.workLogId).includes(worklogIdsToUpdate[0])) {
                const wkResponse = response.submissionDetails.find(w => w.workLogId === worklogIdsToUpdate[0]);
                const obj = {
                  workLogId: wkResponse.workLogId,
                  description: wkResponse.comment,
                  timeSpentInSeconds: wkResponse.hours * 3600,
                  timeSpentInHours: wkResponse.hours
                }
                worklog.workLogItems = [...worklog.workLogItems, obj];
              }
              else {
                worklog.workLogItems = worklog.workLogItems.map(w => {
                  if (worklogIdsToUpdate.includes(w.workLogId)) {
                    const data = response.submissionDetails.find(wk => wk.workLogId === w.workLogId);

                    return {
                      ...w,
                      description: data.comment,
                      timeSpentInSeconds: data.hours * 3600,
                      timeSpentInHours: data.hours
                    }
                  }
                  return w;
                });
              }
            }
            return worklog;
          })
        }
      }

    }
    return dayLog;
  });


  const { timeLoggedInSeconds, worklogPercentage } = calculateTotalLoggedTimeInSeconds(updatedLoggedTimePerDay, summary.totalAvailableSeconds);

  return {
    updatedSummary: {
      ...summary,
      loggedTimePerDay: updatedLoggedTimePerDay,
      totalLoggedTimeInSeconds: timeLoggedInSeconds,
      worklogPercentage: worklogPercentage
    },
    summaryData: updateSummaryData(selectedTicketDetails, summaryData, summary.workLogHoursPerDayConfig, updatedLoggedTimePerDay)
  };
}

function calculateTotalLoggedTimeInSeconds(worklogsPerDay: LoggedTimePerDay[], totalAvailableSeconds: number) {
  const timeLoggedInSeconds = worklogsPerDay.reduce(
    (acc, day) =>
      acc + day.data.reduce(
        (ticketAcc, ticket) =>
          ticketAcc + ticket.workLogItems?.reduce(
            (worklogAcc, worklog) => worklogAcc + worklog.timeSpentInSeconds,
            0
          ),
        0
      ),
    0
  );

  const worklogPercentage = (timeLoggedInSeconds / totalAvailableSeconds) * 100;
  return {
    timeLoggedInSeconds,
    worklogPercentage
  };
}

function addWorklog(worklogData: TicketWorklogData[], worklogResponse: AISubmittedResponse, ticketId: string, ticketDescription: string): TicketWorklogData[] {

  worklogData = Array.isArray(worklogData) ? [...worklogData] : [];

  const { workLogId, comment, hours } = worklogResponse.submissionDetails[0];

  const worklogObject = {
    workLogId: workLogId,
    description: comment,
    timeSpentInSeconds: hours * 3600,
    timeSpentInHours: hours
  };


  if (worklogData.find(w => w.ticketId === ticketId)) {
    worklogData = worklogData.map(w => {
      if (w.ticketId === ticketId) {
        return {
          ...w,
          workLogItems: [...w.workLogItems, worklogObject]
        };
      }
      return w;
    });
  }
  else {
    worklogData.push({
      ticketId,
      ticketDescription,
      workLogItems: [worklogObject]
    });
  }

  return worklogData;
}

function updateSummaryData(selectedTicketDetails: SelectedTicketDetails,
  summaryData: AILogMyWorkSummaryData,
  numberOfHours: number,
  loggedTimePerDay: LoggedTimePerDay[]): AILogMyWorkSummaryData {

  if (!summaryData || summaryData.date !== selectedTicketDetails.date) return summaryData;

  const totalTimeSpentInHours = loggedTimePerDay.find(d => d.date === selectedTicketDetails.date)
    .data.
    flatMap(w => w.workLogItems)
    .reduce((total, w) => total + w.timeSpentInSeconds, 0) / 3600;
  return {
    ...summaryData,
    hours: numberOfHours - totalTimeSpentInHours,
    accountId: '',
  };
}

