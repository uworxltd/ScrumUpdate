/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { ActivatedRoute } from '@angular/router';
import { JwtHelperService } from "@auth0/angular-jwt";
import { Constants } from 'app/constants';
import { DropdownItem } from 'app/dropdowns/dropdown-item';
import { MemberWorklog, TeamWorklog } from 'app/interface/team-worklog-stats';
import { AccessLevels, LoadingState } from 'app/states/app-states';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';
import { getTimeZoneDate } from './week-input/week-input.component';
import { isValid as isDateValid, isBefore as isDateBefore, startOfMonth, subMonths, isSameDay } from 'date-fns';
import { HttpRequest } from '@angular/common/http';
import { TrackingService, UserActions } from 'app/services/tracking';
import { first } from 'rxjs/operators';

export type setComponentStateForReport = (
  componentId: string,
  dataAvailable: boolean
) => void;

export const IS_LOCALHOST = environment.SERVER_NAME === 'localhost';
export const PROTOCOL = `${IS_LOCALHOST ? 'http:' : 'https:'}`;
export const LOGIN_PAGE_URL = `${PROTOCOL}//${environment.APP_PORT ? environment.SERVER_NAME + ':' + environment.APP_PORT : environment.SERVER_NAME}${environment.LOGIN_PAGE}`;
export const API_URL = `${PROTOCOL}//${IS_LOCALHOST ? '' : 'kbs.'}${environment.SERVER_PORT ? environment.SERVER_NAME + ':' + environment.SERVER_PORT : environment.SERVER_NAME}`;
/**
 * Whether the MS OAuth (calendar) integration is configured. Set at runtime via
 * env.js (NG_MS_OAUTH_ENABLED ← INTEGRATIONS_MS_OAUTH_CLIENT_ID in compose).
 * When false the Calendar UI is hidden (graceful disable).
 */
export const MS_OAUTH_ENABLED = environment.MS_OAUTH_ENABLED;
/**
 * Converts a delimited word into PascalCase.
 *
 * This function takes a string containing a word or phrase separated by a specified delimiter
 * and transforms it into PascalCase format where each word is capitalized and concatenated
 * without spaces or the delimiter.
 *
 * @param {string} word - The input word or phrase to be converted to PascalCase.
 * @param {string} delimiter - The delimiter used to separate words within the input string.
 * @returns {string} The input string converted to PascalCase.
 *
 * @example
 * const input = "hello_world";
 * const result = pascalCaseDelimitedWord(input, "_");
 * // Result: "HelloWorld"
 */
export function pascalCaseDelimetedWord(word: string, delimiter: string): string {
  return word
    .split(delimiter)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join('');
}

export function setComponentStateForReport(
  componentId: string,
  dataAvailable: boolean
) {
  if (!this.fetchOwnData) return;

  const key = Constants.COMPONENTS_STATE_SESSION_KEY;
  const dataStr = sessionStorage.getItem(key);

  if (dataStr) {
    const data = JSON.parse(dataStr);

    for (let obj of data) {
      if (componentId === obj.id) {
        obj.isLoaded = true;
        obj.isDataAvailable = dataAvailable;
      }
    }

    sessionStorage.setItem(key, JSON.stringify(data));
  }
}

export function getUsername() {
  return localStorage.getItem(Constants.USERNAME_SESSION_KEY);
}

export function setDataInLocalStorage(key: string, value: any) {
  return localStorage.setItem(key, value);
}

export function wait<T = void>(ms: number) {
  return new Promise<T>((resolve) => setTimeout(resolve, ms));
}

export async function findElementWithText(selector: string, text: string, timeout = 5000, dom: HTMLElement = document.documentElement) {
  const el = () => Array.from(dom.querySelectorAll<HTMLElement>(selector))?.find(tab => tab.textContent?.toLowerCase() === text?.toLowerCase());

  while (!el() && timeout > 0) {
    await wait(100);
    timeout -= 100;
  }

  return el();
}

export async function findElement<T extends HTMLElement>(selector: string, timeout = 5000, dom: HTMLElement = document.documentElement) {
  const el = () => dom.querySelector<T>(selector);

  while (!el() && timeout > 0) {
    await wait(100);
    timeout -= 100;
  }

  return el();
}

export function areArraysEqual(array1: any[], array2: any[]) {
  return array1.sort().toString() == array2.sort().toString();
}

export function getVersonMismatch() {
  const match = window.location.href.match(/versionMismatch=([a-zA-Z]+)/);
  return match ? match[1] : null;
}


export function removeProvideFeedbackButton() {
  let provideFeedbackElement = document.getElementById('atlwdg-trigger')
  if (provideFeedbackElement)
    provideFeedbackElement.remove();
}

/**
 * Return boolean, if the user is logged in or not.
 */
export function hasToken(): boolean {
  return localStorage.getItem(Constants.TOKEN_SESSION_KEY) == null ? false : true;
}

export function sortSprintListBasedOnEndDate(givenSortedSprint: Array<any>) {
  let activeSprintList = [];
  let futureSprintList = [];
  let closedSprintslist = [];
  let finalSprintList = [];

  //Accending Order
  var sort_fn = function (a, b) {
    var dateA = new Date(a.endDate),
      dateB = new Date(b.endDate);
    if (!a.endDate && b.endDate) return 1;
    else if (a.endDate && !b.endDate) return -1;
    else if (dateA === dateB) return 0;
    else return dateA > dateB ? 1 : dateB > dateA ? -1 : 0;
  };

  for (let i = 0; i < givenSortedSprint.length; i++) {
    if (givenSortedSprint[i].status.toLowerCase() == 'ACTIVE'.toLowerCase()) {
      activeSprintList.push(givenSortedSprint[i]);
      activeSprintList.sort(sort_fn);
    }

    if (givenSortedSprint[i].status.toLowerCase() == 'FUTURE'.toLowerCase()) {
      futureSprintList.push(givenSortedSprint[i]);
      futureSprintList.sort(sort_fn);
    }

    if (givenSortedSprint[i].status.toLowerCase() == 'CLOSED'.toLowerCase()) {
      closedSprintslist.push(givenSortedSprint[i]);
      //Deccending Order
      closedSprintslist.sort(function (a, b) {
        var c: any = new Date(a.endDate);
        var d: any = new Date(b.endDate);
        return d - c;
      });
    }
  }
  finalSprintList = activeSprintList.concat(futureSprintList);
  finalSprintList = finalSprintList.concat(closedSprintslist);

  return finalSprintList;
}

export function getConcatenatedTeamBoards(teamBoards: any) {
  const TEAM_BOARD_DELIMITER: string = ', ';
  let teamBoardString: any = '';

  if (
    teamBoards != null &&
    teamBoards.length > 0 &&
    typeof teamBoards != 'string'
  ) {
    teamBoardString = teamBoards.join(TEAM_BOARD_DELIMITER);
  } else {
    teamBoardString = teamBoards;
  }

  return teamBoardString;
}

/**
 * Converts string of dd/mm/yyyy to Date format accepted by javascript and returns the date;
 *
 * @param date
 */
export function convertToDate(date: any) {
  const dateParts = date.split('/');

  // month is 0-based, that's why we need dataParts[1] - 1
  return new Date(+dateParts[2], dateParts[1] - 1, +dateParts[0]);
}

/**
 * This method formats the string
 * First parameter to the function is the string to be formatted
 * String format must be like {Person name is %s1 and age is %s2} and pass the s1 and s2 values as second and third parameter
 *
 * @param args - arguments
 */
export const parseParametrizedString = (...args) => {
  let str = args[0];
  const params = args.slice(1);
  const placeHolderCount = (str.match(/%s/g) || []).length;
  const loopCounter =
    params.length > placeHolderCount ? params.length : placeHolderCount;
  let i = 0;
  for (let j = 1; j <= loopCounter; j++) {
    str = str.replace(new RegExp('%s' + j, 'g'), params[i++]);
  }
  return str;
};

export interface IGroup<T2, T> {
  key: T2;
  val: T[];
}

/**
 * This function will not retain list references
 * @param list
 * @param key
 * @returns
 */
export function group<T, T2>(list: Iterable<T>, key: (item: T) => T2) {
  const groups: IGroup<T2, T>[] = [];
  const newList: Iterable<T> = [...list];

  return Array.from(newList).reduce((groups, item) => {
    const k = key(item);
    const idx = groups.findIndex((g) => g.key == k);
    const group = idx > -1 ? groups[idx] : { key: k, val: [] };
    group.val.push(item);

    if (idx == -1) groups.push(group);

    return groups;
  }, groups);
}

export interface ITreeNode<T extends ITreeNode<T>> {
  children: T[];
}

export function loadExternalImage(url: string) {
  return new Promise<HTMLImageElement>((resolve) => {
    const img = new Image();
    img.src = url;
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      resolve(img);
    };
    img.onerror = () => {
      resolve(null);
    };
  });
}

export function itemsWithoutGroups<T extends DropdownItem>(items: T[]) {
  return items.filter((t) => !t.is_group);
}

/**
 * Refer to {@link https://stackoverflow.com/questions/18557497/how-to-get-html5-canvas-todataurl-file-size-in-javascript}
 * Division by 8 is to convert the size in byte from bits
 *
 * @param dataUrl - base 64 image url
 * @returns size of image in bytes
 */
export function getCanvasDataUrlSize(dataUrl) {
  return (
    Math.round(((dataUrl.length - 'data:image/png;base64,'.length) * 3) / 4) / 8
  );
}

//refactor after removing username in query paramater.
export function getPage(): string {
  const page = location.href.split('?')[0].split('/').pop();
  return page;
}

export function hasAnyWhiteListURL(): boolean {
  if (
    location.href.includes('forgot-password') ||
    location.href.includes('change-password') ||
    location.href.includes('forgot-password/success') ||
    location.href.includes('forgot-password/change-password') ||
    location.href.includes('forgot-password/password-success') ||
    location.href.includes('/signup') ||
    location.href.includes('forgot-password/password-success') ||
    location.href.includes('/login') ||
    location.href.includes('/logout')
  ) {
    return false;
  }
  return true;
}

export function getTokenValue(): string {
  const tok = localStorage.getItem(Constants.TOKEN_SESSION_KEY);
  if (!tok) return '';
  return tok.replace(
    Constants.TOKEN_SESSION_START_VALUE,
    Constants.EMPTY_STRING
  );
}

/**
 * Extracts the `sub` claim (user email) from the JWT stored in localStorage.
 * Returns an empty string if the token is missing, malformed or the claim
 * cannot be found.
 */
export function getUserEmailSavedInToken(): string {
  const token = getTokenValue();
  if (!token) return '';

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.sub || '';
  } catch (error) {
    console.error('Failed to parse token for email', error);
    return '';
  }
}

export function isTokenExpired(): boolean {
  const token = getTokenValue();
  if (!token) return true;
  const jwtHelper = new JwtHelperService();
  return jwtHelper.isTokenExpired(token);

}

export function hasTheSameAccessLevel(tokenA: string, tokenB: string): boolean {
  const jwtHelper = new JwtHelperService();
  const authA: [] = jwtHelper.decodeToken(tokenA).authorities;
  const authB: [] = jwtHelper.decodeToken(tokenB).authorities;
  return JSON.stringify(authA) === JSON.stringify(authB);
}


/*
 * Returns true if a user is admin.
 *
 * @param {string} token a Javascript Web Token in base64 encoded, `.` separated form
 * @returns true or false
 */
export function checkIfUserIsAdmin(accessibleAccessLevels?: string[]) {
  try {
    const token = getTokenValue();
    if (!token) return false;

    if (JSON.parse(atob(token.split('.')[1])).authorities == 'ADMIN' ||
      accessibleAccessLevels?.includes(AccessLevels.Admin)) {
      return true;
    } else {
      false;
    }
  } catch (error) {
    console.error(error);
    return false;
  }
}

export function checkIfUserIsTenantAdmin(accessibleAccessLevels: string[]): boolean {
  return accessibleAccessLevels.includes(AccessLevels.TenantAdmin);
}

export function checkIfUserHasAdminOrHigherLevelAccess(accessibleAccessLevels: string[]): boolean {
  return accessibleAccessLevels.includes(AccessLevels.Admin);
}

/**
 * sort dropdown items with item text alphabetically
 */
export function sortDropdownItems(dropdownItems: DropdownItem[]) {
  return dropdownItems.sort((itemOne, itemTwo) => {
    let value1 = itemOne.item_text.toLowerCase();
    let value2 = itemTwo.item_text.toLowerCase();

    if (value1 < value2) {
      return -1;
    }

    if (value1 > value2) {
      return 1;
    }
    // names must be equal
    return 0;
  });
}

/**
 * Converts a given date string in ISO 8601 format to a custom formatted date string.
 * @param {string} inputDate - The input date string in ISO 8601 format (e.g., "2023-09-18T12:46:20.042610200Z").
 * @returns {string} The formatted date string (e.g., "September 18, 2023 at 12:46:20 PM").
 */
export function convertISOtoCustomDateAndTimeFormat(inputDate: string) {
  const date = new Date(inputDate);
  const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Adding 1 because months are zero-based
  const day = date.getDate().toString().padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  const timeZone = getTimeZone(date);
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds} ${timeZone}`;
}

/**
 * Returns a timeZone from given date.
 * @param {string} inputDate - The input date object to be used for returning timeZone
 * @returns {string} The timeZone of given date
 */
export function getTimeZone(date: Date) {
  const timeZoneOffset = date.getTimezoneOffset();
  const offsetHours = Math.floor(Math.abs(timeZoneOffset) / 60);
  const offsetMinutes = Math.abs(timeZoneOffset) % 60;
  const offsetSign = timeZoneOffset < 0 ? '+' : '-';
  const timeZone = `(UTC${offsetSign}${offsetHours.toString().padStart(2, '0')}:${offsetMinutes.toString().padStart(2, '0')})`;
  const timeZoneName = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return timeZone + " " + timeZoneName;
}

/**
 * Method which returns true if all configs are disabled(false)
*/
export function allConfigsDisabled(configsMap: any) {
  return Object.values(configsMap).every(config => config as boolean == false);
}

export async function showJiraFeedbackTicketDialog() {
  const elementId = 'atlwdg-trigger';

  // Feedback widget is disabled unless an issue collector URL is configured.
  if (!environment.JIRA_ISSUE_COLLECTOR_LINK) {
    return;
  }

  let element = await findElement(`#${elementId}`)

  if (!element) {
    const body = <HTMLDivElement>document.body;

    const script = document.createElement('script');
    script.innerHTML = '';
    script.src = environment.JIRA_ISSUE_COLLECTOR_LINK;
    script.async = true;
    script.defer = true;
    script.id = "provide-feedback-button";
    body.appendChild(script);

    const style = document.createElement('style');
    style.textContent = `#${elementId}{display:none}`;
    body.appendChild(style);

    element = await findElement(`#${elementId}`);
  }

  if (element) {
    element.click();
  }
}

export function appendTokenToURL(url: string) {
  return url + "?token=" + localStorage.getItem("token")?.substring(7);
}

/***
 * Method to verify is given component enabled in configuration
 */
export function isComponentEnabled(componentConfiguration: any[], componentId: string) {
  const value = componentConfiguration?.find(data => data.id == componentId);
  if (componentConfiguration && value) {
    return value.enabled;
  }
  // If VARIANCE_INDICATOR does not exist in config,
  // consider it off by default
  else if (componentId === Constants.VARIANCE_INDICATOR) {
    return false;
  }
  return true;
}

/**
 * Method which returns active access levels
*/
export function getActiveAccessLevels(accessLevels: any, accessibleAccessLevels: string[]): any {
  let newAccessList: any[] = [];
  accessLevels.forEach(element => {
    let accessLevelItem = {
      code: element.levelCode,
      name: Constants.ACCESS_LEVEL_CODE_NAME_MAP[element.levelCode],
      description: element.description,
      inactive: !accessibleAccessLevels.includes(element.levelCode),
      disabledOptionTooltipText: !accessibleAccessLevels.includes(element.levelCode) ? 'You do not have the required access to assign this access level to a user.' : null
    }
    newAccessList.push(accessLevelItem);
  });
  newAccessList = newAccessList.reverse();
  return newAccessList;
}

export function parseDate(input: string): Date {
  const parts = input.split(/[-T:.]/);
  const sign = input.charAt(input.length - 3) === '+' ? -1 : 1;
  const offset = parseInt(parts.pop() || '', 10) * sign;
  const date = new Date(Date.UTC(
    +parts[0],     // year
    +parts[1] - 1, // month
    +parts[2],     // day
    +parts[3] + offset, // hour
    +parts[4],     // minute
  ));
  return date;
}

/**
 * Checks if a json is valid by testing with a regex.
 * @param str to check
 * @returns true if json is valid
 */
export function isJsonValid(str: string): boolean {
  if (!str) return false;
  const regex = /^[\],:{}\s]*$/
    .test(
      str
        .replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@')
        .replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']')
        .replace(/(?:^|:|,)(?:\s*\[)+/g, '')
    );
  return regex;
}

/**
 * Determines if any of alerts, epics, bugs, indicators and
 * burnup loading states are equal to any provided
 * @param loadingStates loading states
 * @param loadingState to compare with
 * @returns
 */
export function isAnyStatsLoadingState(loadingStates, loadingState: LoadingState) {
  return loadingStates.epicLoadingState === loadingState ||
    loadingStates.bugChartLoadingState === loadingState ||
    loadingStates.indicatorsLoadingState === loadingState ||
    loadingStates.burnupLoadingState === loadingState ||
    loadingStates.velocityStatisticsLoadingState === loadingState ||
    loadingStates.issuesChartLoadingState === loadingState ||
    loadingStates.alertLoadingState === loadingState;
}

/***
 * Method to calculate total for given json value
 */
export function calculateTotalForJsonObject(category: any) {
  return Number(Object.values(category).reduce((total, value) => Number(total) + Number(value), 0));
}


/***
 * Method to calculate total worklog of given categories
 * Categories can be main (includes all categories created in Khoji)/other
 */
export function getTotalWorklogOfGivenCategory(categoryData, objectToMap) {
  if (categoryData != undefined && categoryData != null) {
    const categoryKeys = Object.keys(categoryData).map(key => ({ key: key, value: categoryData[key] }));
    categoryKeys.forEach(element => {
      objectToMap[element.key] == undefined ? objectToMap[element.key] = element.value.totalDaysSpent : objectToMap[element.key] += element.value.totalDaysSpent;
    });
  }
}

/**
 * Method to restrict values upto 2 decimal places
 * @param value
 * @returns
 */
export function restrictToDecimalPlace(value: number) {
  if (Number.isNaN(value)) {
    return 0;
  }
  return Number(value.toFixed(2));
}

/**
 * Method to get common members to avoid showing muliple rag colors for one member
 * @param teamWorklog
 * @returns
 */
export function getUniqueMembers(teamWorklog: TeamWorklog[]) {
  let membersList: MemberWorklog[] = [];
  teamWorklog.forEach(teamData => {
    membersList = membersList.concat(teamData.memberWorklogs);
  });

  let newMembersList: MemberWorklog[] = [];
  const membersAccountIdsAndEmailSet = new Set<string>();

  membersList.forEach(memberData => {
    if (membersAccountIdsAndEmailSet.has(concatenateMemberAccountIdAndEmail(memberData.email, memberData.accountId))) {
      newMembersList = replaceMemberInList(newMembersList, memberData);
    }
    else {
      newMembersList.push(memberData);
      membersAccountIdsAndEmailSet.add(concatenateMemberAccountIdAndEmail(memberData.email, memberData.accountId));
    }
  });
  return newMembersList;
}

function concatenateMemberAccountIdAndEmail(memberEmail: string, memberAccountId: string) {
  let email = memberEmail ? memberEmail : "*";
  let accountId = memberAccountId ? memberAccountId : "*";
  return email.concat("-").concat(accountId);
}

function replaceMemberInList(membersList: MemberWorklog[], memberDetail: MemberWorklog) {
  const memberIndex = membersList.findIndex(data => data.accountId == memberDetail.accountId);
  if (memberIndex >= 0) {

    if (memberDetail.thresholdColor !== Constants.RED_COLOR_CODE) {
      membersList[memberIndex] = memberDetail;
    }
  }
  return membersList
}

export function checkMultipleTeamMember(worklogs) {
  return worklogs.some((teamWorklog) => {
    return teamWorklog.memberWorklogs.some((memberWorklog) => memberWorklog.inMultipleTeams);
  });
}

/**
 * Filters an array of sprints to return only unique sprint objects based on their IDs.
 * @param givenSprints - An array containing sprint objects with IDs to be filtered for uniqueness.
 * @returns An array containing unique sprint objects based on their IDs.
 */
export function filterUniqueSprints(givenSprints: Array<any>) {
  var result = givenSprints.reduce((unique, o) => {
    if (!unique.some((obj) => obj.id === o.id)) {
      unique.push(o);
    }
    return unique;
  }, []);
  return result;
}

export function isGivenStringNullOrEmpty(str: string): boolean {
  return str === null || str === undefined || str === "";
}

/**
 * Returns the appropriate greeting message based on the current time.
 *
 * @param translations - An object containing global translations for Khoji.
 * @returns The appropriate greeting message.
 */
export function getGreetingsAccordingToTheTime(translations: any) {
  const currentHour = new Date().getHours();

  const { goodMorning, goodAfternoon, goodEvening, hello } = translations.greetings;

  if (currentHour >= 5 && currentHour < 12) {
    return goodMorning;
  } else if (currentHour >= 12 && currentHour < 17) {
    return goodAfternoon;
  } else if (currentHour >= 17 && currentHour < 21) {
    return goodEvening;
  } else {
    return hello;
  }
}

export function updateUrlParams(params: any, keysToRemove: string[] = []) {
  const url = new URL(location.href);
  for (const key in params) {
    if (params.hasOwnProperty(key)) {
      let value = params[key];
      if (value === '') {
        url.searchParams.delete(key);
      } else {
        value = encodeURIComponent(value)
        url.searchParams.set(key, value);
      }
    }
  }
  keysToRemove.forEach(key => {
    url.searchParams.delete(key);
  });
  history.replaceState({}, '', decodeURIComponent(url.toString()));
}

export function checkDateValidity(startDate: Date, endDate: Date) {
  const today = new Date();
  const isSameOrBefore = (date: Date) => isSameDay(date, today) || isDateBefore(date, today);
  return isDateValid(startDate) && isSameOrBefore(startDate) && isDateValid(endDate) && isSameOrBefore(endDate);
}

export function getStartingDateLimitOfCustomDateRange() {
  return startOfMonth(subMonths(new Date(), 1));
}

export function getReferrer() {
  const referrer = (new URL(location.href)).searchParams.get('referrer');
  return referrer === null ? '' : atob(decodeURIComponent(referrer));
}

export function toReferrer(url: string) {
  return encodeURIComponent(btoa(url))
}

export function observableToPromise<T>(observable: Observable<T>) {
  return new Promise<T>((resolve, reject) => observable.pipe(first()).subscribe(resolve, reject));
}

export const getElementWidth = (selector: string) => document.querySelector(selector)?.getBoundingClientRect().width;

export function getParentActivatedRoute(parentComponentType: any, route: ActivatedRoute): ActivatedRoute | null {
  const parent = route.parent;

  if (!parent) return null;

  if (parent.component === parentComponentType) {
    return parent;
  }
  else {
    return getParentActivatedRoute(parentComponentType, parent);
  }
}

export function getCurrentInstance() {
  return sessionStorage.getItem(Constants.INSTANCE_ID);
}

export function getCurrentWorkspace() {
  return sessionStorage.getItem(Constants.SPACE_ID);
}

export function convertDateToISO(dateStr: string, timeZone?: string): string {
  const date = getTimeZoneDate(new Date(dateStr), timeZone);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function saveRedirectUrl(saveExtraContent: boolean = true) {
  const currentUrl = new URL(window.location.href);
  let result = currentUrl.pathname;

  if (saveExtraContent) {
    result += currentUrl.search + currentUrl.hash;
  }

  sessionStorage.setItem(environment.REDIRECT_URL, result);
}

export function formatDateString(dateString: string): string {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return new Intl.DateTimeFormat('en-US', options).format(date);
}

export function preLoadImage(url: string) {
  return new Promise<void>((resolve, reject) => {
    const img = new Image();
    img.src = url;
    img.onload = () => resolve();
    img.onerror = () => reject();
  });
}

export function clearStorageExcept(storage: Storage, exceptions: string[]) {
  const keys = Object.keys(storage);
  keys.forEach(key => {
    if (!exceptions.includes(key)) {
      storage.removeItem(key);
    }
  });
}

export function clearLocalStorage(exceptions: string[] = []) {
  const defaultExceptions = ['Refresh_token', 'unleash:repository:repo', 'unleash:repository:sessionId', 'isHours', Constants.TOUR_GEN_AI_WORKLOG_TABLE, Constants.TOUR_GEN_AI_WORKLOG, Constants.IS_HOURS_STORAGE_KEY];
  exceptions = exceptions.concat(defaultExceptions);
  clearStorageExcept(localStorage, exceptions);
}

/**
 * drawdown.js
 * (c) Adam Leggett
 */
export function markdown(src: string) {
  const rx_lt = /</g;
  const rx_gt = />/g;
  const rx_space = /\t|\r|\uf8ff/g;
  const rx_escape = /\\([\\\|`*_{}\[\]()#+\-~])/g;
  const rx_hr = /^([*\-=_] *){3,}$/gm;
  const rx_blockquote = /\n *&gt; *([^]*?)(?=(\n|$){2})/g;
  const rx_list = /\n( *)(?:[*\-+]|((\d+)|([a-z])|[A-Z])[.)]) +([^]*?)(?=(\n|$){2})/g;
  const rx_listjoin = /<\/(ol|ul)>\n\n<\1>/g;
  const rx_highlight = /(^|[^A-Za-z\d\\])(([*_])|(~)|(\^)|(--)|(\+\+)|`)(\2?)([^<]*?)\2\8(?!\2)(?=\W|_|$)/g;
  const rx_code = /\n((```|~~~).*\n?([^]*?)\n?\2|((    .*?\n)+))/g;
  const rx_link = /((!?)\[(.*?)\]\((.*?)( ".*")?\)|\\([\\`*_{}\[\]()#+\-.!~]))/g;
  const rx_table = /\n(( *\|.*?\| *\n)+)/g;
  const rx_thead = /^.*\n( *\|( *\:?-+\:?-+\:? *\|)* *\n|)/;
  const rx_row = /.*\n/g;
  const rx_cell = /\||(.*?[^\\])\|/g;
  const rx_heading = /(?=^|>|\n)([>\s]*?)(#{1,6}) (.*?)( #*)? *(?=\n|$)/g;
  const rx_para = /(?=^|>|\n)\s*\n+([^<]+?)\n+\s*(?=\n|<|$)/g;
  const rx_stash = /-\d+\uf8ff/g;

  type RepalceFn = (...args: any[]) => string;

  function replace(search: RegExp | string, replace: RepalceFn | string) {
    src = src.replace(search, replace as any);
  }

  function element(tag: string, content: string) {
    return '<' + tag + '>' + content + '</' + tag + '>';
  }

  function blockquote(src: string) {
    return src.replace(rx_blockquote, function (all, content) {
      return element('blockquote', blockquote(highlight(content.replace(/^ *&gt; */gm, ''))));
    });
  }

  function list(src: string) {
    return src.replace(rx_list, function (all, ind, ol, num, low, content) {
      var entry = element('li', highlight(content.split(
        RegExp('\n ?' + ind + '(?:(?:\\d+|[a-zA-Z])[.)]|[*\\-+]) +', 'g')).map(list).join('</li><li>')));

      return '\n' + (ol
        ? '<ol start="' + (num
          ? ol + '">'
          : parseInt(ol, 36) - 9 + '" style="list-style-type:' + (low ? 'low' : 'upp') + 'er-alpha">') + entry + '</ol>'
        : element('ul', entry));
    });
  }

  function highlight(src: string) {
    return src.replace(rx_highlight, function (all, _, p1, emp, sub, sup, small, big, p2, content) {
      return _ + element(
        emp ? (p2 ? 'strong' : 'em')
          : sub ? (p2 ? 's' : 'sub')
            : sup ? 'sup'
              : small ? 'small'
                : big ? 'big'
                  : 'code',
        highlight(content));
    });
  }

  function unesc(str: string) {
    return str.replace(rx_escape, '$1');
  }

  var stash: string[] = [];
  var si = 0;

  src = '\n' + src + '\n';

  replace(rx_lt, '&lt;');
  replace(rx_gt, '&gt;');
  replace(rx_space, '  ');

  // blockquote
  src = blockquote(src);

  // horizontal rule
  replace(rx_hr, '<hr/>');

  // list
  src = list(src);
  replace(rx_listjoin, '');

  // code
  replace(rx_code, function (all, p1, p2, p3, p4) {
    stash[--si] = element('pre', element('code', p3 || p4.replace(/^    /gm, '')));
    return si + '\uf8ff';
  });

  // link or image
  replace(rx_link, function (all, p1, p2, p3, p4, p5, p6) {
    stash[--si] = p4
      ? p2
        ? '<img src="' + p4 + '" alt="' + p3 + '"/>'
        : '<a href="' + p4 + '">' + unesc(highlight(p3)) + '</a>'
      : p6;
    return si + '\uf8ff';
  });

  // table
  replace(rx_table, function (all, table) {
    var sep = table.match(rx_thead)[1];
    return '\n' + element('table',
      table.replace(rx_row, function (row, ri) {
        return row == sep ? '' : element('tr', row.replace(rx_cell, function (all, cell, ci) {
          return ci ? element(sep && !ri ? 'th' : 'td', unesc(highlight(cell || ''))) : ''
        }))
      })
    )
  });

  // heading
  replace(rx_heading, function (all, _, p1, p2) { return _ + element('h' + p1.length, unesc(highlight(p2))) });

  // paragraph
  replace(rx_para, function (all, content) { return element('p', unesc(highlight(content))) });

  // stash
  replace(rx_stash, function (all) { return stash[parseInt(all)] });

  return src.trim();
}

export function filterQueryParams(params: URLSearchParams, exclude?: string[], include?: string[]) {
  const _params = new URLSearchParams();

  for (const [key, value] of params) {
    if (exclude?.length && exclude.includes(key)) {
      continue;
    }

    if (include?.length) {
      if (include.includes(key)) {
        _params.append(key, value);
      }
    }
    else {
      _params.append(key, value);
    }
  }

  return _params;
}

export async function waitForValue<T>(condition: () => boolean, value: () => T, timeout = 5000) {
  while (!condition() && timeout > 0) {
    await wait(100);
    timeout -= 100;
  }

  return value();
}

export function deepClone<T>(data: T) {
  return JSON.parse(JSON.stringify(data)) as T;
}

export function hexToHsl(hex: string) {
  // Remove '#' if present
  hex = hex.replace(/^#/, '');

  // Expand shorthand (#f00 → #ff0000)
  if (hex.length === 3) {
    hex = hex.split('').map(ch => ch + ch).join('');
  }

  // Parse r, g, b
  let r = parseInt(hex.substring(0, 2), 16) / 255;
  let g = parseInt(hex.substring(2, 4), 16) / 255;
  let b = parseInt(hex.substring(4, 6), 16) / 255;

  let max = Math.max(r, g, b);
  let min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    // Achromatic (gray)
    h = s = 0;
  } else {
    let d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0));
        break;
      case g:
        h = ((b - r) / d + 2);
        break;
      case b:
        h = ((r - g) / d + 4);
        break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),        // Hue in degrees (0–360)
    s: Math.round(s * 100),        // Saturation in %
    l: Math.round(l * 100)         // Lightness in %
  };
}

export function hslToHex({ h, s, l }) {
  // Normalize values
  h = h % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;

  function hueToRgb(p, q, t) {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  }

  let r, g, b;

  if (s === 0) {
    // Achromatic (gray)
    r = g = b = l;
  } else {
    let q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    let p = 2 * l - q;
    let hk = h / 360;

    r = hueToRgb(p, q, hk + 1 / 3);
    g = hueToRgb(p, q, hk);
    b = hueToRgb(p, q, hk - 1 / 3);
  }

  const toHex = x => {
    const hex = Math.round(x * 255).toString(16).padStart(2, '0');
    return hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function getLightBackgroundFromTextColor(textColorHex: string, lightness = 50) {
  // 1. Convert hex to HSL (example placeholder function)
  const hslColor = hexToHsl(textColorHex);

  // 2. Increase lightness (adjust as needed)
  hslColor.l = Math.min(100, hslColor.l + lightness); // Increase lightness by 20%, cap at 100%

  // 3. Convert HSL back to hex (example placeholder function)
  return hslToHex(hslColor);
}

export function makeUtcDate([year, month, day, hour, minute, second]: number[]): Date {
  return new Date(Date.UTC(year || 0, (month || 0) - 1, day || 0, hour || 0, minute || 0, second || 0));
}

export function hash(str: string): string {
  let hash = 0;

  if (str.length === 0) return hash.toString();

  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  return hash.toString();
}

export function createCacheKey(req: HttpRequest<any>, appendString: (req: HttpRequest<any>) => string): string {
  const { urlWithParams: url, body, headers } = req;
  const appendStr = appendString(req);
  const bodyHash = hash(JSON.stringify(body)).toString();

  return `cache_${url}_${bodyHash}_${appendStr}`;
}

export function connectMSCalendar(trackingService: TrackingService) {
  const authUrl = constructMsOAuthUrl();
  localStorage.setItem('ms-teams', 'clicked')
  window.location.href = authUrl;
  trackingService.captureUserAction(UserActions.LogMyWork.ConnectMSCalendar);
}

export function constructMsOAuthUrl(): string {
  saveRedirectUrl(true);

  const url = environment.MS_OAUTH_TOKEN_URL
  const clientId = environment.MS_OAUTH_CLIENT_ID;
  const scope = environment.MS_OAUTH_REQUESTED_SCOPES;

  const authUrl = url +
    `client_id=${encodeURIComponent(clientId)}&` +
    `response_type=code&` +
    `redirect_uri=${encodeURIComponent(LOGIN_PAGE_URL)}&` +
    `response_mode=query&` +
    `scope=${encodeURIComponent(scope)}&`

  return authUrl;
}

export function filterNbspFromHtml(text: string) {
  if (!text) return '';
  return text.replace(/&nbsp;/g, ' ').trim();
}

export function convertNewlineToHtmlBreak(text: string) {
  if (!text) return '';
  return text.replace(/\n/g, '<br>').trim();
}
