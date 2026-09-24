/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { createSelector, select } from "@ngrx/store";
import { Member, Team } from "app/admin/admin.entities";
import { Constants } from 'app/constants';
import { DateLabel } from "app/dropdowns/date-range/date-range.component";
import { DropdownItem } from "app/dropdowns/dropdown-item";
import { DropdownConfig } from "app/interface/khoji-config.interface";
import { sortSprintListBasedOnEndDate } from "app/shared/helper-functions";
import { pipe } from "rxjs";
import { filter, map } from "rxjs/operators";
import { AppState } from "./app-states";

export function getDropdownItems<T>(items: T[], configs: DropdownConfig[], transform: (item: T) => DropdownItem) {
  const config = configs.filter(c => c.enabled)
    .map(c => ({ ...c, groups: c.groups.filter(g => !g.exclude) }))[0];

  if (config && config.groups.length > 0 && config.key) {
    const _items: DropdownItem[] = [];

    const groups = config.groups.map(g => ({ ...g, key: g.key || config.key })).sort((a, b) => a.order - b.order);
    const allGroups = configs[0].groups.map(g => ({ ...g, key: g.key || config.key }));

    const itemsWithNoGroups = items.filter(item => allGroups.findIndex(group => (typeof item[group.key] === "string" ? item[group.key].toUpperCase() : item[group.key]) === (typeof group?.value === "string" ? group?.value?.toUpperCase() : group?.value)) === -1);
    const dynamicGroups = [...new Set(itemsWithNoGroups.map(item => item[config.key]))];
//WARN: assert from munsab
    for (const dynamicGroup of dynamicGroups) {
      groups.push({
        name: dynamicGroup.toString()?.toUpperCase(),
        key: config.key,
        value: dynamicGroup,
        code: dynamicGroup,
        description: "",
        expand: false,
        exclude: false,
        order: 0
      });
    }
//WARN: assert from munsab
    for (const group of groups) {
      const groupValue = typeof group.value === "string" ? group.value.toUpperCase() : group.value;
      const children = items.filter(t => typeof group.value === "string" ? t[group.key].toUpperCase() === groupValue : t[group.key] === groupValue).map(t => transform(t));

      if (children.length > 0) {
        _items.push({
          item_id: group.name,
          item_text: group.name,
          is_group: true,
          grouping_key: group.key,
          grouping_value: groupValue,
          expand: group.expand
        });

        _items.push(...children.map(c => ({ ...c, grouping_key: group.key, grouping_value: groupValue })));
      }
    }

    const groupsToShow = _items.filter(g => g.is_group);

    if (groupsToShow.length > 0 && groupsToShow.filter(g => g.expand).length === 0) {
      _items.filter(i => i.is_group)[0].expand = true;
    }

    return _items;
  }

  return items.map(t => transform(t));
}

export function getArrayFromMap(inputMap: Map<any, any>) {
  return Object.entries(inputMap).map(ent => ({ ...ent[1], key: ent[0] }));
}


export function filterUniqueSprints(givenSprints: Array<any>) {
  var result = givenSprints.reduce((unique, o) => {
    if (!unique.some(obj => obj.id === o.id)) {
      unique.push(o);
    }
    return unique;
  }, []);
  return result;
}

export function processSprints(givenSprints: Array<any>) {
  return filterUniqueSprints(sortSprintListBasedOnEndDate(givenSprints));
}



// Team List

const teamsListGroupSelector = createSelector(
  (state: AppState) => state.globalFilters?.teamsList || [],
  (state: AppState) => state.globalConfigs?.groupingConfigs.analysisByWorklog.team || [],
  (teamsList, configs) => getDropdownItems<any>(teamsList, configs, (team) => ({
    ...team,
    item_id: team.teamName || team,
    item_text: team.teamName || team,
    item_value: team.teamName || team,
    item_status: team.status
  }))
);


const teamsListSelector = createSelector(
  teamsListGroupSelector,
  (state: AppState) => state.globalFilters.teams,
  (items, teams) => items.map(item => item.is_group ? item : ({
    ...item,
    item_selected: teams.includes((item as any).teamName)
  }))
);



// Dates

const dateRangeSelector = createSelector(
  (state: AppState) => state.globalFilters?.dateFrom,
  (state: AppState) => state.globalFilters?.dateTo,
  (dateFrom, dateTo) => ({ dateFrom: dateFrom, dateTo: dateTo })
);

const dateLabelSelector = createSelector(
  (state: AppState) => state.globalFilters?.dateLabel,
  (dateLabel: DateLabel) => ({ dateLabel: dateLabel })
);

const teamMembersSelector = createSelector(
  (state: AppState) => state.globalFilters?.members || [],
  (teamMembers: Member[]) => {
    return Array.from(new Set(teamMembers.map(item => item.accountId)))
      .map(id => teamMembers.find(item => item.accountId === id));
  }
);

// Worklog Teams List

const worklogTeamsListGroupSelector = createSelector(
  (state: AppState) => state.admin?.teams || [],
  (state: AppState) => state.globalConfigs?.groupingConfigs.teamWorklogAnalysis.team || [],
  (teamsList, configs) => getDropdownItems<Team>(teamsList, configs, (team) => ({
    ...team,
    item_id: team.teamName,
    item_text: team.teamName,
    item_value: team,
    //item_status: team.status
  }))
);

const worklogTeamsListSelector = createSelector(
  worklogTeamsListGroupSelector,
  (state: AppState) => state.globalFilters?.worklogTeams || [],
  (items, teams) => items.map(item => item.is_group ? item : ({
    ...item,
    item_selected: teams.includes((item as any as Team).teamName)
  }))
);


export function extractMembersForSelectedWorklogTeams(worklogTeamsList: Team[], selectedWorklogTeams: string[]) {
  return worklogTeamsList
    .filter(tl => selectedWorklogTeams.includes(tl.teamName) && tl.members)
    .flatMap(tl =>
      tl.members.map(m => ({
        ...m,
        memberRole: m.role.name
      }))
    )
    .filter((m, i, self) => self.findIndex(_m => _m.id === m.id) == i);
}

export function updateWorklogTeamsList(worklogTeamsList: Team[], teamsMembers: any) {

  for (const teamId of Object.keys(teamsMembers)) {
    worklogTeamsList = worklogTeamsList.map(w => {
      if (w.id.toString() == teamId) {
        return { ...w, member: teamsMembers[teamId] };
      }
      return w;
    });
  }
  return worklogTeamsList;
}

export function getMembersFromTeamMap(teamMembers: { key: Array<Member>; }) {
  let members: Member[] = [];
  for (const teamId of Object.keys(teamMembers)) {
    teamMembers[teamId].forEach(((m: Member) => {
      //TODO: accountId and Email identifiers for members need to be refactored to one unique identifier
      const memberWithRole = { ...m, memberRole: m.role.name };
      members.push(memberWithRole);
    }));
  }
  return members;
}

// Member List

const memberListGroupSelector = createSelector(
  (state: AppState) => state.requestFilters?.worklogTeams || [],
  (state: AppState) => state.requestFilters?.worklogTeamsList || [],
  (state: AppState) => state.requestFilters?.members || [],
  (state: AppState) => state.requestFilters?.users || [],
  (state: AppState) => state.globalConfigs.groupingConfigs.teamWorklogAnalysis.member,
  (worklogTeams, worklogTeamsList, members, users, configs) => getDropdownItems<Member>(extractMembersForSelectedWorklogTeams(worklogTeamsList, worklogTeams), configs, (member) => ({
    ...member,
    item_id: member.id.toString(),
    item_value: member,
    item_text: member.fullName,
    // item_subtext: member.member_account_id, <In future will show profile picture here/ email and account id is sensitive information>
    item_status_label: member.status === Constants.MEMBER_REVOKED_STATUS ? 'SUSPENDED' : '',
    item_selected: members.findIndex(sm => sm.id === member.id) > -1
  }))
);

const memberListSelector = createSelector(
  memberListGroupSelector,
  (state: AppState) => state.requestFilters?.members || [],
  (items, members) => items.map(item => item.is_group ? item : ({
    ...item,
    item_selected: members.findIndex(sm => sm.id === (item as any as Member).id) > -1
  }))
);

const dateToSelector = createSelector(
  (state: AppState) => state.globalFilters,
  (filters) => filters.dateTo
);


const worklogTeamsFilterSelector = createSelector(
  (state: AppState) => state.requestFilters,
  (filters) => filters.worklogTeamsFilter,
);

export const selectDateTo = pipe(
  select(dateToSelector),
  filter(dateTo => dateTo !== '' && dateTo !== undefined)
)

export const selectTeamsList = pipe(
  select(teamsListSelector),
  filter(data => data.length > 0)
);

export const selectDateRange = pipe(
  select(dateRangeSelector)
);

export const selectDateLabel = pipe(
  select(dateLabelSelector)
);

export const selectWorklogTeamsList = pipe(
  select(worklogTeamsListSelector),
  filter(data => data.length > 0)
);

export const selectMembersList = pipe(
  select(memberListSelector)
);

export const selectUnqiueTeamMembers = pipe(
  select(teamMembersSelector)
);

export const selectWorklogTeamsFilter = pipe(
  select(worklogTeamsFilterSelector),
  filter(team => team != null || team != undefined),
);

export const selectWorklogTeamsSelectedByFilter = pipe(
  select(worklogTeamsFilterSelector),
  filter(team => team != null || team != undefined),
  map(teams => teams.filter(team => teams.every(t => !t.selected) ? true : team.selected)),
  map(teams => teams.map(team => team.name)),
);
