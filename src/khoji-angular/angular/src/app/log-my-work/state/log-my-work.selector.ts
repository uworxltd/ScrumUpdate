import { createSelector, select } from "@ngrx/store";
import { getCurrentInstance } from "app/shared/helper-functions";
import { getTimeZoneDate } from "app/shared/week-input/week-input.component";
import { AppState, LogMyWork } from "app/states/app-states";
import { statsForWeekendSettingSelector } from "app/states/global-configs.selector";
import { WorklogSummaryData } from "app/team-worklog/team-work-logged-percentage/team-work-logged-percentage.component";
import { format } from 'date-fns';
import { pipe } from "rxjs";
import { filter } from "rxjs/operators";

const instanceUserSelector = createSelector(
  (state: AppState) => state.logMyWork,
  (logMyWork: LogMyWork) => logMyWork.instanceUser
);

export const selectInstanceUser = pipe(
  select(instanceUserSelector),
  filter(instanceUser => instanceUser !== undefined)
);

const worklogSummarySelector = createSelector(
  (state: AppState) => state.logMyWork,
  (logMyWork: LogMyWork) => logMyWork.summary
);

const submittedWorklogResponse = createSelector(
  (state: AppState) => state.logMyWork,
  (logMyWork: LogMyWork) => logMyWork.submittedWorklogResponse
);

export const selectWorklogSummary = pipe(
  select(worklogSummarySelector),
  filter(worklogSummary => worklogSummary !== undefined)
);

const worklogActivityState = createSelector(
  (state: AppState) => state.logMyWork,
  (logMyWork: LogMyWork) => logMyWork.activityState
);

const worklogSummaryData = createSelector(
  (state: AppState) => state.logMyWork,
  (logMyWork: LogMyWork) => logMyWork.summaryData
);

const selectedTicketDetails = createSelector(
  (state: AppState) => state.logMyWork,
  (logMyWork: LogMyWork) => logMyWork.selectedTicketDetails
);

const worklogHoursPerDaySelector = createSelector(
  (state: AppState) => state.logMyWork,
  (logMyWork: LogMyWork) => logMyWork.summary.workLogHoursPerDayConfig
);

const worklogSummaryTransformedSelector = createSelector(
  worklogSummarySelector,
  instanceUserSelector,
  statsForWeekendSettingSelector,
  (summary, user, weekendStatsEnabled) => {
    if (!summary) return null;

    const firstDate = new Date(summary.loggedTimePerDay[0].date);
    const lastDate = new Date(summary.loggedTimePerDay[summary.loggedTimePerDay.length - 1].date);

    const availableCapacity = calculateAvailableCapacity(firstDate, lastDate, user.timeZone, weekendStatsEnabled);
    const availableCapacityInHours = parseFloat((availableCapacity * summary.workLogHoursPerDayConfig).toFixed(2));
    const loggedTime = parseFloat((summary.totalLoggedTimeInSeconds / (summary.workLogHoursPerDayConfig * 3600)).toFixed(2));
    const loggedTimeInHours = parseFloat((summary.totalLoggedTimeInSeconds / 3600).toFixed(2));
    const loggedPercentage = (loggedTime / availableCapacity) * 100;

    let color: string = '';
    if (loggedPercentage < summary.thresholdPercentage.Medium) {
      color = summary.thresholdColors.Low;
    } else if (loggedPercentage >= summary.thresholdPercentage.Medium && loggedPercentage < summary.thresholdPercentage.Normal) {
      color = summary.thresholdColors.Medium;
    } else {
      color = summary.thresholdColors.Normal;
    }

    const summaryData: WorklogSummaryData = {
      loggedPercentage,
      availableCapacity,
      availableCapacityInHours,
      loggedTime,
      loggedTimeInHours,
      color,
      workLogHoursPerDayConfig: summary.workLogHoursPerDayConfig
    };


    const firstMonth = format(firstDate, 'MMM yyyy');
    const lastMonth = format(lastDate, 'MMM yyyy');
    const monthRange = firstMonth === lastMonth ? firstMonth : `${firstMonth} - ${lastMonth}`;

    const tableDetails = {
      month: monthRange,
      userNameAndTotalHours: {
        userName: user.name,
        totalHours: parseFloat(
          (summary.loggedTimePerDay.reduce((acc, loggedDay) => {
            const totalTimeSpentInSeconds = loggedDay.data.reduce(
              (ticketAcc, ticket) =>
                ticketAcc + (Array.isArray(ticket.workLogItems) && ticket.workLogItems.length > 0
                  ? ticket.workLogItems.reduce(
                    (worklogAcc, worklog) => worklogAcc + worklog.timeSpentInSeconds,
                    0
                  )
                  : 0),
              0
            );

            return acc + totalTimeSpentInSeconds;
          }, 0) / 3600).toFixed(2)
        )

      },
      dateAndDay: summary.loggedTimePerDay.map(loggedDay => {
        const [year, month, day] = loggedDay.date.split('-');
        const totalTimeSpentInSeconds = loggedDay.data.reduce(
          (ticketAcc, ticket) =>
            ticketAcc + (Array.isArray(ticket.workLogItems) && ticket.workLogItems.length > 0
              ? ticket.workLogItems.reduce(
                (worklogAcc, worklog) => worklogAcc + worklog.timeSpentInSeconds,
                0
              )
              : 0),
          0
        );

        return {
          date: day,
          month: month,
          year: year,
          day: new Date(+year, +month - 1, +day).toLocaleString('en-us', { weekday: 'short' }),
          loggedHour: parseFloat((totalTimeSpentInSeconds / 3600).toFixed(2))
        };
      })

    };

    return { summaryData, tableDetails, updatedFromEffect: summary.updatedFromEffect };
  }
);


const selectedTicketWorklogsSelector = createSelector(
  worklogSummarySelector,
  selectedTicketDetails,
  (summary, ticketDetails) => {
    if (!summary) return null;
    const { ticketId, ticketDescription, date } = ticketDetails;
    if (!ticketId || !date) return null;

    let ticketWorklogs = summary.loggedTimePerDay.find(worklog => worklog.date === date)
      ?.data
      ?.find(data => data.ticketId === ticketId);

    if (!ticketWorklogs) return {
      ticketId,
      ticketDescription,
      workLogItems: [],
    };

    ticketWorklogs = { ...ticketWorklogs };
    ticketWorklogs.workLogItems = ticketWorklogs.workLogItems.map(worklog => {
      return { ...worklog, timeSpentInHours: +(worklog.timeSpentInSeconds / 3600).toFixed(2), description: worklog.description ?? '' }
    });

    return ticketWorklogs;
  }
);

export const selectWorklogSummaryTransformed = pipe(
  select(worklogSummaryTransformedSelector)
)

const aiGeneratedWorklogSelector = createSelector(
  (state: AppState) => state.logMyWork,
  (logMyWork: LogMyWork) => logMyWork.aiGeneratedWorklog
);

const uniqueIdentifierSelector = createSelector(
  (state: AppState) => state.logMyWork,
  (logMyWork: LogMyWork) => logMyWork.uniqueIdentifier
);

export const selectAIGeneratedWorklog = pipe(
  select(aiGeneratedWorklogSelector),
  filter(aiGeneratedWorklog => aiGeneratedWorklog !== undefined)
);

export const selectUniqueIdentifier = pipe(
  select(uniqueIdentifierSelector),
  filter(uniqueIdentifier => uniqueIdentifier !== undefined)
);

const issueValiditySelector = createSelector(
  (state: AppState) => state.logMyWork,
  (logMyWork: LogMyWork) => logMyWork.issueIdValidity
);

export const selectIssueValidity = pipe(
  select(issueValiditySelector),
);

export const selectWorklogActivityState = pipe(
  select(worklogActivityState)
)

export const selectWorklogSummaryData = pipe(
  select(worklogSummaryData),
  filter(summaryData => summaryData !== null)
);

export const selectSubmittedWorklogResponse = pipe(
  select(submittedWorklogResponse),
  filter(w => w?.response?.submissionDetails?.length > 0)
);

const worklogDetailsTransformedSelector = createSelector(
  worklogSummarySelector,
  instanceUserSelector,
  (summary, user) => {
    const firstDate = new Date(summary.loggedTimePerDay[0].date);
    const lastDate = new Date(summary.loggedTimePerDay[summary.loggedTimePerDay.length - 1].date);

    const firstMonth = format(firstDate, 'MMM yyyy');
    const lastMonth = format(lastDate, 'MMM yyyy');
    const monthRange = firstMonth === lastMonth ? firstMonth : `${firstMonth} - ${lastMonth}`;
    const tickets = {};
    const data = {
      month: monthRange,
      userName: user.name,
      totalHours: parseFloat(
        (summary.loggedTimePerDay.reduce((acc, loggedDay) => {
          // Sum up the time spent in each ticket's worklog items for each day
          const totalTimeSpentInSeconds = loggedDay.data.reduce(
            (ticketAcc, ticket) =>
              ticketAcc + (Array.isArray(ticket.workLogItems) && ticket.workLogItems.length > 0
                ? ticket.workLogItems.reduce(
                  (worklogAcc, worklog) => worklogAcc + worklog.timeSpentInSeconds,
                  0
                )
                : 0),
            0
          );

          return acc + totalTimeSpentInSeconds;
        }, 0) / 3600).toFixed(2)
      ),
      dateAndDay: summary.loggedTimePerDay.map(loggedDay => {
        const [year, month, day] = loggedDay.date.split('-');

        loggedDay.data.forEach(ticketData => {
          if (!tickets[ticketData.ticketId]) {
            tickets[ticketData.ticketId] = {};
          }

          tickets[ticketData.ticketId]['description'] = ticketData['ticketDescription'];

          tickets[ticketData.ticketId][loggedDay.date] = {
            loggedHour: parseFloat((ticketData.workLogItems.reduce(
              (worklogAcc, worklog) => worklogAcc + worklog.timeSpentInSeconds,
              0
            ) / 3600).toFixed(2))
          };
        });

        const totalTimeSpentInSeconds = loggedDay.data.reduce(
          (ticketAcc, ticket) =>
            ticketAcc + (Array.isArray(ticket.workLogItems) && ticket.workLogItems.length > 0
              ? ticket.workLogItems.reduce(
                (worklogAcc, worklog) => worklogAcc + worklog.timeSpentInSeconds,
                0
              )
              : 0),
          0
        );

        return {
          _date: loggedDay.date,
          date: day,
          month: month,
          year: year,
          day: new Date(+year, +month - 1, +day).toLocaleString('en-us', { weekday: 'short' }),
          loggedHour: parseFloat((totalTimeSpentInSeconds / 3600).toFixed(2)) // Convert seconds to hours
        };
      }),
    }

    return {
      ...data,
      tickets: Object.entries(tickets).map(([ticketId, ticketData]) => ({ ticket: ticketId, data: ticketData })).sort((a, b) => a.ticket.localeCompare(b.ticket))
    };
  }
);

export const selectWorklogDetailsTransformed = pipe(
  select(worklogDetailsTransformedSelector),
);

export const selectTicketWorklogs = pipe(
  select(selectedTicketWorklogsSelector),
  filter(data => data !== null)
);

export const selectSelectedTicketDetails = pipe(
  select(selectedTicketDetails),
  filter(d => d.date !== '' || d.ticketId !== '')
)

const manualWorklogSubmitted = createSelector(
  (state: AppState) => state.logMyWork,
  (logMyWork: LogMyWork) => logMyWork.manualWorklogSubmitted
);

const manualWorkLogModalStateSelector = createSelector(
  (state: AppState) => state.logMyWork,
  (logMyWork: LogMyWork) => logMyWork.manualWorkLogModal
)

export const selectManualWorkLogModalState = pipe(
  select(manualWorkLogModalStateSelector),
  filter(v => v.showModal)
)

export const selectManualWorklogSubmitted = pipe(
  select(manualWorklogSubmitted)
);

export const selectWorklogHoursPerDay = pipe(
  select(worklogHoursPerDaySelector)
);

const userPreferencesUpdatedSelector = createSelector(
  (state: AppState) => state.logMyWork,
  (logMyWork: LogMyWork) => logMyWork.userPreferencesUpdated
);

export const selectUserPreferencesUpdated = pipe(
  select(userPreferencesUpdatedSelector),
);

function calculateAvailableCapacity(firstDate: Date, endDate: Date, timeZone: string, weekendStatsEnabled: boolean) {
  const currentDate = getTimeZoneDate(new Date(), timeZone);

  let effectiveEndDate = endDate;
  if (currentDate >= firstDate && currentDate < endDate) {
    effectiveEndDate = currentDate;
  }

  const weekendDays = [0, 6];
  let workingDays = 0;
  let currentDatePointer = firstDate;

  while (currentDatePointer <= effectiveEndDate) {
    const dayOfWeek = currentDatePointer.getDay();
    // if weekend stats inclusion is enabled, show all, else filter weekends
    if (weekendStatsEnabled || !weekendDays.includes(dayOfWeek)) {
      workingDays++;
    }
    currentDatePointer.setDate(currentDatePointer.getDate() + 1);
  }

  return workingDays;
}

const weeklyWorklogSummarySelector = createSelector(
  (state: AppState) => state.logMyWork,
  (logMyWork: LogMyWork) => logMyWork.weeklyWorklogSummary
);

export const selectWeeklyWorklogSummary = pipe(
  select(weeklyWorklogSummarySelector),
  filter((data) => data?.instanceId?.toString() === getCurrentInstance())
);

const weeklyWorklogSummaryDateRangeSelector = createSelector(
  (state: AppState) => state.logMyWork,
  (logMyWork: LogMyWork) => logMyWork.weeklyWorklogSummaryDateRange
);

export const selectWeeklyWorklogSummaryDateRange = pipe(
  select(weeklyWorklogSummaryDateRangeSelector),
);

const dailyScrumUpdatesSelector = createSelector(
  (state: AppState) => state.logMyWork,
  (logMyWork: LogMyWork) => logMyWork.dailyScrumUpdates
);

export const selectDailyScrumUpdates = pipe(
  select(dailyScrumUpdatesSelector),
  filter((data) => data?.instanceId?.toString() === getCurrentInstance())
);

const dailyScrumDatesSelector = createSelector(
  (state: AppState) => state.logMyWork,
  (logMyWork: LogMyWork) => logMyWork.dailayScrumDates
);

export const selectDailyScrumDates = pipe(
  select(dailyScrumDatesSelector),
  filter(data => !!data.todayDate && !!data.yesterdayDate)
);

const savedDailyScrumDatesSelector = createSelector(
  (state: AppState) => state.logMyWork,
  (logMyWork: LogMyWork) => logMyWork.savedDailyScrumUpdates
);

export const selectSavedDailyScrumDates = pipe(
  select(savedDailyScrumDatesSelector),
);