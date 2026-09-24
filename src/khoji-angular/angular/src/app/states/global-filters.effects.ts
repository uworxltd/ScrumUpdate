/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { TypedAction } from '@ngrx/store/src/models';
import { Observable, of } from 'rxjs';
import { catchError, concatMap, map, mergeMap, takeUntil, withLatestFrom } from 'rxjs/operators';

import { environment } from 'app/../environments/environment';
import { Team, User } from 'app/admin/admin.entities';
import { Constants } from 'app/constants';
import { HttpService } from 'app/services/common/http.service';
import { KhojiSpinnerService } from 'app/services/spinner.service';
import { getUsername } from 'app/shared/helper-functions';

import { setMembersLoadingState } from 'app/admin/state/admin.actions';
import { AdminState } from 'app/admin/state/admin.state';
import { AppState, GlobalConfigs, GlobalFilters, LoadingState, LoadingStates } from './app-states';
import * as actions from './app.actions';

@Injectable()
export class FiltersEffects {
  constants = Constants;

  teamsEffect$ = createEffect(() => this.actions$.pipe(
    ofType(actions.fetchTeamsList),
    mergeMap(action => this.fetchTeams(action).pipe(map(res => this.dispatchTeams(res))))
  ));

  membersEffect$ = createEffect(() => this.actions$.pipe(
    ofType(actions.fetchMembers),
    concatMap(action => of(action).pipe(withLatestFrom(this.store.select('globalFilters'), this.store.select('loadingStates'), this.store.select('globalConfigs'), this.store.select('admin')))),
    mergeMap(([action, filters, loadingStates, configs, admin]) => this._fetchMembers(action, filters, configs, admin).pipe(map(res => this.dispatchMembers(res, loadingStates))))
  ));

  usersEffect$ = createEffect(() => this.actions$.pipe(
    ofType(actions.fetchUsers),
    mergeMap((action) => this.fetchUsers(action).pipe(map(res => this.dispatchUsers(res)))),
  ));

  constructor(
    private http: HttpService,
    private spinner: KhojiSpinnerService,
    private actions$: Actions,
    private store: Store<AppState>
  ) { }

  fetchTeams(action: TypedAction<"[Global Filters] FetchTeamsList">) {
    this.spinner.show();
    const username = getUsername();
    let url = environment.ALL_TEAMS;
    if (username) {
      url = environment.REGISTERED_TEAMS + username;
    }
    return <Observable<string[]>>this.http.apiGetRequest(url)
      .pipe(catchError((error) => {
        return of(this.store.dispatch(actions.fetchError()));
      }));
  }

  _fetchMembers(action: TypedAction<"[Global Filters] FetchMembers">, filters: GlobalFilters, configs: GlobalConfigs, adminState: AdminState) {
    this.store.dispatch(setMembersLoadingState({loadingState: LoadingState.Loading}))

    let url = environment.ACTIVE_TEAM_MEMBERS_URL;
    const params = { teamIds: this.getSelectedTeamsIds(adminState.teams, filters.worklogTeams), dateFrom: filters.dateFrom, dateTo: filters.dateTo }

    return <Observable<string[]>>this.http.apiPostRequest(url, params, false)
      .pipe(
        takeUntil(
          this.actions$.pipe(
            ofType(
              actions.discardSentCallsAfterNavigate
            )
          )
        ),
        catchError((error) => {
          return of(this.store.dispatch(actions.fetchError()));
        })
      );
  }

  fetchUsers(action: any) {
    this.spinner.show();
    this.store.dispatch(actions.setUsersLoadingState({ loadingState: LoadingState.Loading }));
    const url = environment.USERS_API;

    return <Observable<User[]>>this.http.apiGetRequest(url)
      .pipe(catchError((error) => {
        this.spinner.hide();
        return of(this.store.dispatch(actions.setUsersLoadingState({ loadingState: LoadingState.Error })));
      }));
  }


  fetchWorklogTeams(action: any) {
    this.spinner.show();
    const username = getUsername();
    let url = environment.DASHBOARD;
    if (username) {
      url = environment.REGISTER_TEAMBOARD + username;
    }
    return <Observable<Team[]>>this.http.apiGetRequest(url)
      .pipe(catchError((error) => {
        return of(this.store.dispatch(actions.fetchError()));
      }));
  }

  dispatchTeams(response: string[]) {
    this.spinner.hide();

    if (response === undefined) {
      return actions.fetchError();
    }

    return actions.setTeamsList({ list: response });
  }
  dispatchMembers(response: any, loadingStates: LoadingStates) {
    if (response === undefined) {
      this.store.dispatch(setMembersLoadingState({loadingState: LoadingState.Error}))
      return actions.fetchError();
    }

    this.store.dispatch(setMembersLoadingState({loadingState: LoadingState.Done}))
    return actions.setTeamMembers({ teamsMembers: response });
  }

  dispatchUsers(response: User[]) {
    if (response === undefined) {
      return actions.fetchError();
    }

    this.spinner.hide();
    this.store.dispatch(actions.setUsersLoadingState({ loadingState: LoadingState.Done }));
    return actions.setUsers({ users: response });
  }


  // dispatchWorklogTeams(response: TeamsDataModel[]) {
  //   this.spinner.hide();

  //   if (response === undefined) {
  //     return actions.fetchError();
  //   }
  //   return actions.setWorklogTeamsList({ list: response });
  // }

  getSelectedTeamsIds(worklogTeamsList: Team[], worklogTeams: string[]) {
    const selectedTeams = [];
    for (const team of worklogTeams) {
      const filteredList = worklogTeamsList.filter(w => w.teamName.includes(team)).map(t =>  t.id )[0];
      if(filteredList){
        selectedTeams.push(filteredList);
      }
    }
    return selectedTeams;
  }
}
