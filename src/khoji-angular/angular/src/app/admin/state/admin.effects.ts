/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { TypedAction } from '@ngrx/store/src/models';
import { environment } from 'app/../environments/environment';
import { Member, Organization, Teamboard } from 'app/admin/admin.entities';
import { CategoryConfig } from 'app/interface/category-config.interface';
import { HttpService } from 'app/services/common/http.service';
import { FeatureFlagService } from 'app/services/feature.flag.service';
import { KhojiSpinnerService } from 'app/services/spinner.service';
import { WizardService } from 'app/services/wizard.service';
import { UserListMapperPipe } from 'app/shared/user-list.pipe';
import { AppState, LoadingState } from 'app/states/app-states';
import * as actions from 'app/states/app.actions';
import { discardSentCallsAfterNavigate, fetchError, updateUserAccessCountOnRevoke } from 'app/states/app.actions';
import { MessageService } from 'primeng/api';
import { EMPTY, Observable, of } from 'rxjs';
import { catchError, delay, map, mergeMap, takeUntil, tap } from 'rxjs/operators';
import { Constants } from '../../constants';
import { AdminActions, TrackingService } from '../../services/tracking';
import { ProjectIntegrationUser, Role, Team } from '../admin.entities';
import * as adminActions from './admin.actions';
import { emailUpdatedStatus, fetchKhojiTeamsList, fetchUsers, setUserPreferenceUpdated } from './admin.actions';
import { AccessLevels, AdminState } from './admin.state';

@Injectable()
export class AdminEffects {
  constants = Constants;

  constructor(
    private http: HttpService,
    private actions$: Actions,
    private store: Store<AppState>,
    private messageService: MessageService,
    private router: Router,
    private spinner: KhojiSpinnerService,
    private wizardService: WizardService,
    private feature: FeatureFlagService,
    private trackingService: TrackingService,
  ) { }

  accessLevelEffect$ = createEffect(() => this.actions$.pipe(
    ofType(adminActions.getAccessLevels),
    mergeMap((action) => this.fetchAccessLevels(action).pipe(map((res) => this.dispatchAccessLevels(res))))
  ));

  adminEffect$ = createEffect(() => this.actions$.pipe(
    ofType(adminActions.fetchUsers, adminActions.fetchUsersInTeams),
    mergeMap((action) => this.fetchUsers(action).pipe(map(res => this.dispatchUsers(res, (action.type === adminActions.fetchUsersInTeams.type) ? null : action.selectUsersIds)))),
  ));

  usersAgainstMembersEffect$ = createEffect(() => this.actions$.pipe(
    ofType(adminActions.fetchUsersAgainstsMemberIds),
    mergeMap((action) => this.fetchUsersAgainsMembers(action).pipe(map(res => this.dispatchUsersAgainsMembers(res))))
  ));

  teamsListEffect$ = createEffect(() => this.actions$.pipe(
    ofType(adminActions.fetchKhojiTeamsList),
    mergeMap((action) => this.fetchTeams(action).pipe(map(res => this.dispatchTeams(res)))),
  ));


  membersListEffect$ = createEffect(() => this.actions$.pipe(
    ofType(adminActions.fetchMembersList),
    mergeMap((action) => this.fetchMembers(action).pipe(map(res => this.dispatchMembers(res)))),
  ));


  sendUserInviteEffect$ = createEffect(() => this.actions$.pipe(
    ofType(adminActions.sendUserInvite),
    mergeMap(action => this.sendUserInvite(action).pipe(map(res => this.showToast(res, action))))
  ), { dispatch: false });

  deleteTeamEffect$ = createEffect(() => this.actions$.pipe(
    ofType(adminActions.deleteTeams),
    mergeMap(action => this.deleteTeams(action).pipe(map(res => this.showTeamDeletedToast(res, action))))
  ), { dispatch: false });

  createNewTeamEffect$ = createEffect(() => this.actions$.pipe(
    ofType(adminActions.createNewTeam),
    mergeMap(action => this.createNewTeam(action).pipe(map(res => this.showTeamToast(res, action))))
  ), { dispatch: false });

  updateTeamEffect$ = createEffect(() => this.actions$.pipe(
    ofType(adminActions.updateTeam),
    mergeMap(action => this.updateTeam(action).pipe(map(res => this.showTeamUpdatedToast(res, action))))
  ), { dispatch: false });

  assignSupervisorsEffect$ = createEffect(() => this.actions$.pipe(
    ofType(adminActions.assignSupervisors),
    mergeMap(action => this.assignSupervisors(action).pipe(map(res => this.showSupervisorAssignedToast(res))))
  ), { dispatch: false });

  sendInviteAgainEffect$ = createEffect(() => this.actions$.pipe(
    ofType(adminActions.sendInviteAgain),
    mergeMap(action => this.sendInviteAgain(action).pipe(map(res => this.showInviteAgainToast(res))))
  ), { dispatch: false });

  revokeUserAccessEffect$ = createEffect(() => this.actions$.pipe(
    ofType(adminActions.revokeUserAccess),
    mergeMap(action => this.revokeUserAccess(action).pipe(map(res => this.showrevokeAccessToast(res))))
  ), { dispatch: false });

  enableAccessEffect$ = createEffect(() => this.actions$.pipe(
    ofType(adminActions.enableAccess),
    mergeMap(action => this.enableAccess(action).pipe(map(res => this.showAccessEnabledToast(res))))
  ), { dispatch: false });


  editUserEffect$ = createEffect(() => this.actions$.pipe(
    ofType(adminActions.editUser),
    mergeMap(action => this.editUser(action).pipe(map(res => this.showUserUpdatedToast(res, action.editingUserID))))
  ), { dispatch: false });

  editUserInBulkEffect$ = createEffect(() => this.actions$.pipe(
    ofType(adminActions.editUserInBulk),
    mergeMap(action => this.editUserInBulk(action).pipe(map(res => this.editUserInBulkShowToast(res, action.isBulkEdit))))
  ));

  emailupdatedEffect$ = createEffect(() => this.actions$.pipe(
    ofType(adminActions.emailUpdated),
    mergeMap(action => this.editUser(action).pipe(
      map(res => this.showEmailUpdatedToast(res)),
      catchError((error) => {
        return of(this.store.dispatch(adminActions.emailUpdatedStatus({ success: false })));
      })
    ))
  ), { dispatch: false });

  userCreationSuccess$ = createEffect(() => this.actions$.pipe(
    ofType(adminActions.postSuccessFulUserCreation),
    tap(() => this.router.navigate(['../admin-panel/khoji-users'])))
    , { dispatch: false });



  fetchSourceUsersEffect$ = createEffect(() => this.actions$.pipe(
    ofType(adminActions.fetchSourceUsers),
    mergeMap(action => this.fetchSourceUsers(action).pipe(map(res => this.dispatchSourceUsers(res, action))))
  ));

  fetchCategoryConfigEffect$ = createEffect(() => this.actions$.pipe(
    ofType(adminActions.fetchCategoryConfig),
    mergeMap(action => this.fetchCategoryConfig(action).pipe(map(res => this.dispatchCategoryConfig(res, action))))
  ));

  rolesEffect$ = createEffect(() => this.actions$.pipe(
    ofType(adminActions.fetchRoles),
    mergeMap((action) => this.fetchRoles(action).pipe(map(res => this.dispatchRoles(res)))),
  ));

  basicUsersEffect$ = createEffect(() => this.actions$.pipe(
    ofType(adminActions.fetchBasicUsers),
    mergeMap((action) => this.fetchBasicUsers(action).pipe(map(res => this.dispatchBasicUsers(res)))),
  ));

  assignUserAccessToTeamEffect$ = createEffect(() => this.actions$.pipe(
    ofType(adminActions.assignTeamsAccessToUser),
    mergeMap((action) => this.assignTeamsAccessToUser(action).pipe(map(res => this.dispatchUsersAccessToTeams(res)))),
  ));

  removeUserAccessEffect$ = createEffect(() => this.actions$.pipe(
    ofType(adminActions.removeUserAccessToTeam),
    mergeMap((action) => this.removeUserAccess(action).pipe(map(res => this.dispatchRemoveUsersAccessToTeams(res)))),
  ));

  fetchUserDetailEffect$ = createEffect(() => this.actions$.pipe(
    ofType(adminActions.fetchUserDetail),
    mergeMap((action) => this.fetchUserDetail(action).pipe(map(res => this.dispatchUserDetail(res)))),
  ));

  fetchBillingStrategyEffect$ = createEffect(() => this.actions$.pipe(
    ofType(adminActions.fetchBillingStrategy),
    mergeMap((action) => this.fetchBillingStrategy(action).pipe(map(res => this.dispatchBillingStrategy(res)))),
  ));

  loginWithAtlassianEffect$ = createEffect(() => this.actions$.pipe(
    ofType(adminActions.loginWithAtlassian),
    mergeMap((action) => this.postLoginWithAtlassian(action).pipe(map(res => this.dispatchLoginWithAtlassian(res)))),
  ));

  updateOnboardingTeam$ = createEffect(() => this.actions$.pipe(
    ofType(adminActions.updateOnboardingTeam),
    mergeMap((action) => this.postForTeamUpdate(action).pipe(map(res => this.showTeamUpdateToast(res, action.showToast)))),
  ));

  saveUserPreferenceEffect$ = createEffect(() => 
    this.actions$.pipe(
      ofType(adminActions.saveUserLeavesPreference),
      mergeMap((action) => 
        this.saveUserPreference(action).pipe(
          mergeMap((res) => {
            this.store.dispatch(setUserPreferenceUpdated({ time: Date.now(), leavesTicketId: action.ticketID }));
            return this.showSuccessToastOnUserPreference(res, action);
          })
        )
      )
    )
  );
  

  postForTeamUpdate(action): Observable<any> {
    const url = environment.UPDATE_ONBOARDING_TEAM;
    this.spinner.show();
    this.store.dispatch(adminActions.updateOnboardingTeamLoadingState({ loadingState: LoadingState.Loading }));
    return <any>this.http.apiPostRequest(url, action.team, false)
      .pipe(catchError((error) => {
        this.store.dispatch(adminActions.updateOnboardingTeamLoadingState({ loadingState: LoadingState.Error }))
        this.messageService.add({
          key: 'message',
          severity: 'error',
          summary: "Error!",
          detail: `Something went wrong please try again.`
        });
        this.spinner.hide();
        return of(fetchError());
      })
      )
  }

  showTeamUpdateToast(res, showToast = true, fetchTeams = false) {
    if (res == undefined) {
      return fetchError()
    }

    this.spinner.hide();
    if (fetchTeams) {
      this.store.dispatch(fetchKhojiTeamsList());
      this.store.dispatch(fetchUsers({}));
    }

    if (showToast) {
      this.spinner.hide();
      this.messageService.add({
        key: 'message',
        severity: 'success',
        summary: "Success!",
        detail: `Changes were saved successfully.`
      });
      this.store.dispatch(adminActions.updateOnboardingTeamLoadingState({ loadingState: LoadingState.Done }))
      return actions.fetchUserSetting({ force: true });
    }
    this.store.dispatch(adminActions.updateOnboardingTeamLoadingState({ loadingState: LoadingState.Done }))
    return actions.dummyAction();
  }

  inviteOnboardingUser$ = createEffect(() => this.actions$.pipe(
    ofType(adminActions.inviteOnboardingUser),
    mergeMap((action) => this.inviteUser(action).pipe(map(res => this.updateUserListAndCloseModal(res)))),
  ));

  inviteUser(action): Observable<any> {
    const url = environment.ONBOARDING_INVITE_USER;

    return <any>this.http.apiPostRequest(url, action.users, false)
      .pipe(
        catchError((error) => {
          this.store.dispatch(adminActions.onboardingInviteUserModalStatus({ status: true }));
          return of(this.store.dispatch(fetchError()));
        })
      )
  }

  updateUserListAndCloseModal(res: any) {
    if (res === undefined) {
      this.trackingService.captureUserActionResult(AdminActions.ManageUsers.AddJiraUser, 'Failure')
      return fetchError();
    }

    this.trackingService.captureUserActionResult(AdminActions.ManageUsers.AddJiraUser, 'Success')
    this.messageService.add({
      key: 'message',
      severity: 'success',
      summary: "Success!",
      detail: `The user has been added successfully.`
    });

    this.store.dispatch(adminActions.fetchUsers({}));
    this.store.dispatch(adminActions.onboardingInviteUserModalStatus({ status: false }));
    const count = Array.isArray(res) ? res.length : 1;
    return updateUserAccessCountOnRevoke({ value: count });
  }

  addJiraUsers$ = createEffect(() => this.actions$.pipe(
    ofType(adminActions.addJiraUsers),
    mergeMap((action) => this.addJiraUsers(action).pipe(map(res => this.addJiraUsersComplete(res, action.users, action.tab)))),
  ));

  addJiraUsers(action): Observable<any> {
    const url = environment.ADD_JIRA_USERS;
    const { users } = action;
    this.store.dispatch(adminActions.setAddJiraUsersLoadingState({ loadingState: LoadingState.Loading }));
    this.spinner.show();
    return <any>this.http.apiPostRequest(url, users, false)
      .pipe(
        catchError((error) => {
          this.store.dispatch(adminActions.setAddJiraUsersLoadingState({ loadingState: LoadingState.Error }));
          return of(this.store.dispatch(fetchError()));
        })
      )
  }

  addJiraUsersComplete(res: any, users: ProjectIntegrationUser[], tab: string) {
    this.spinner.hide();

    if (res === undefined) {
      if (tab === "manage-users") {
        this.trackingService.captureUserActionResult(AdminActions.ManageUsers.BulkAddUsers.AddUsers, 'Failure')
      }
      else {
        this.trackingService.captureUserActionResult(AdminActions.ManageTeams.AddFromJira.AddUsers, 'Failure')
      }

      this.store.dispatch(adminActions.setAddJiraUsersLoadingState({ loadingState: LoadingState.Error }));
      return fetchError();
    }

    this.store.dispatch(fetchUsers({ selectUsersIds: users.map(u => u.accountId) }));

    if (tab === "manage-users") {
      this.trackingService.captureUserActionResult(AdminActions.ManageUsers.BulkAddUsers.AddUsers, 'Success')
    }
    else {
      this.trackingService.captureUserActionResult(AdminActions.ManageTeams.AddFromJira.AddUsers, 'Success')
    }

    this.store.dispatch(adminActions.setAddJiraUsersLoadingState({ loadingState: LoadingState.Done }));

    this.messageService.add({
      key: 'message',
      severity: 'success',
      summary: "Success!",
      detail: `The users have been added successfully.`
    });

    this.store.dispatch(adminActions.onboardingInviteUserModalStatus({ status: false }));
    this.store.dispatch(updateUserAccessCountOnRevoke({ value: users.length }));

    return adminActions.setAddJiraUsersLoadingState({ loadingState: LoadingState.Done });
  }


  fetchAccessLevels(action: any): Observable<AccessLevels> {
    const url = environment.GET_ACCESS_LEVEL_API;
    return <any>this.http.apiGetRequest(url)
      .pipe(catchError(error => {
        if (error) {
          return of(this.store.dispatch(adminActions.setFieldErrors({ errors: error })));
        }
        return of(this.store.dispatch(fetchError()));
      }));
  }

  dispatchAccessLevels(res: AccessLevels) {
    if (!res) {
      return fetchError();
    }
    return adminActions.setAccessLevels({ accessLevels: res });
  }

  sendUserInvite(action: any) {
    const url = environment.INVITE_USER_API;
    const params = action.userInvite;
    return <Observable<string[]>>this.http.apiPostRequest(url, params, false)
      .pipe(catchError((error) => {
        if (error !== undefined) {
          return of(this.store.dispatch(adminActions.setFieldErrors({ errors: error })));
        }
        return of(this.store.dispatch(fetchError()));
      }));
  }

  deleteTeams(action: any) {
    this.spinner.show();
    this.store.dispatch(adminActions.setDeleteTeamsLoadingState({ loadingState: LoadingState.Loading }));
    const url = environment.DELETE_TEAMS_API;
    const params = { teamIds: action.ids };
    return <Observable<string[]>>this.http.apiPostRequest(url, params, false)
      .pipe(catchError((error) => {
        if (error !== undefined) {
          return of(this.store.dispatch(adminActions.setFieldErrors({ errors: error })));
        }
        this.store.dispatch(adminActions.setDeleteTeamsLoadingState({ loadingState: LoadingState.Error }));
        this.spinner.hide();
        return of(this.store.dispatch(fetchError()));
      }));
  }

  createNewTeam(action: any) {
    this.spinner.show();
    this.store.dispatch(adminActions.setCreateTeamsLoadingState({ loadingState: LoadingState.Loading }));
    const url = environment.CREATE_UPDATE_TEAM_WITH_SOURCE_AND_KHOJI_USERS;
    const params = action.teamData;
    return <Observable<Team>>this.http.apiPostRequest(url, params, false)
      .pipe(catchError((error) => {
        if (error !== undefined) {
          return of(this.store.dispatch(adminActions.setFieldErrors({ errors: error })));
        }
        this.store.dispatch(adminActions.setCreateTeamsLoadingState({ loadingState: LoadingState.Error }));
        this.spinner.hide();
        return of(this.store.dispatch(fetchError()));
      }));
  }

  updateTeam(action: any) {
    this.spinner.show();
    this.store.dispatch(adminActions.setUpdateTeamLoadingState({ loadingState: LoadingState.Loading }));
    const url = environment.CREATE_UPDATE_TEAM_WITH_SOURCE_AND_KHOJI_USERS;
    const params = action.teamData;
    return <Observable<Team>>this.http.apiPostRequest(url, params, false)
      .pipe(catchError((error) => {
        if (error !== undefined) {
          return of(this.store.dispatch(adminActions.setFieldErrors({ errors: error })));
        }
        this.store.dispatch(adminActions.setUpdateTeamLoadingState({ loadingState: LoadingState.Error }));
        this.spinner.hide();
        return of(this.store.dispatch(fetchError()));
      }));
  }

  assignSupervisors(action: any) {
    const url = environment.ASSIGN_SUPERVISORS_API;
    const params = action.data;
    return <Observable<string[]>>this.http.apiPostRequest(url, params, false)
      .pipe(catchError((error) => {
        this.store.dispatch(fetchError());
        return of(this.store.dispatch(adminActions.setSourceProjectsLoadingState({ loadingState: LoadingState.Error })));
      }));
  }

  sendInviteAgain(action: any) {
    const url = environment.INVITE_AGAIN_API;
    const params = action.inviteAgainUsername;
    return <Observable<string[]>>this.http.apiPostRequest(url, params, false)
      .pipe(catchError((error) => {
        return of(this.store.dispatch(fetchError()));
      }));
  }

  revokeUserAccess(action: any) {
    const url = environment.REVOKE_ACCESS;
    this.spinner.show();
    const params = action.revokeAccessUsername;
    return <Observable<string[]>>this.http.apiPostRequest(url, params, false)
      .pipe(catchError((error) => {
        this.spinner.hide();
        return of(this.store.dispatch(fetchError()));
      }));
  }

  enableAccess(action: any) {
    const url = environment.ENABLE_ACCESS;
    this.spinner.show();
    const params = action.revokeAccessUsername;
    return <Observable<string[]>>this.http.apiPostRequest(url, params, false)
      .pipe(catchError((error) => {
        this.spinner.hide();
        return of(this.store.dispatch(fetchError()));
      }));
  }

  editUser(action: any) {
    const url = environment.UPDATE_USER_DETAILS_API;
    const params = action.selectedUser;
    return <Observable<string[]>>this.http.apiPostRequest(url, params, false)
      .pipe(catchError((error) => {
        return of(this.store.dispatch(fetchError()));
      }));
  }

  editUserInBulk(action: any) {
    const url = environment.UPDATE_USER_DETAILS_IN_BULK;
    const params = action.users;
    if (action.isBulkEdit) this.spinner.show();
    this.store.dispatch(adminActions.setUserInLoadingState({ userId: action.users[0]?.id, loadingState: LoadingState.Loading }));

    this.store.dispatch(adminActions.setEditUserInBulkLoadingState({ loadingState: LoadingState.Loading }));
    return this.http.apiPostRequest(url, params, false)
      .pipe(catchError((error) => {
        this.store.dispatch(adminActions.setEditUserInBulkLoadingState({ loadingState: LoadingState.Error }));
        this.store.dispatch(adminActions.setUserInLoadingState({ userId: action.users[0]?.id, loadingState: LoadingState.Done })); // this should be error but for now we are using Done as there is no error template
        return of(this.store.dispatch(fetchError()));
      }));
  }

  fetchUsers(action: any): Observable<AdminState> {
    this.store.dispatch(adminActions.setUsersLoadingState({ loadingState: LoadingState.Loading }));

    const url = (action.type === adminActions.fetchUsersInTeams.type) ? environment.USERS_IN_TEAMS_API : environment.USERS_API;

    return <any>this.http.apiGetRequest(url)
      .pipe(
        catchError((error) => {
          return of(this.store.dispatch(adminActions.setUsersLoadingState({ loadingState: LoadingState.Error })));
        })
      );
  }


  fetchUsersAgainsMembers(action: any): Observable<any> {
    this.spinner.show();
    this.store.dispatch(adminActions.fetchUsersAgainstsMemberIdsLoadingState({ loadingState: LoadingState.Loading }));

    const url = environment.USERS_AGAINST_MEMBERS;

    return <any>this.http.apiPostRequest(url, action.memberIds, false)
      .pipe(catchError((error) => {
        this.spinner.hide();
        this.store.dispatch(adminActions.fetchUsersAgainstsMemberIdsLoadingState({ loadingState: LoadingState.Error }));
        return EMPTY;
      }));
  }

  fetchBasicUsers(action: any): Observable<AdminState> {
    this.spinner.show();
    this.store.dispatch(adminActions.setBasicUsersLoadingState({ loadingState: LoadingState.Loading }));
    const url = environment.BASIC_USERS_API
    return <any>this.http.apiGetRequest(url)
      .pipe(catchError((error) => {
        this.spinner.hide();
        return of(this.store.dispatch(adminActions.setBasicUsersLoadingState({ loadingState: LoadingState.Error })));
      }));
  }

  assignTeamsAccessToUser(action: any): Observable<AdminState> {
    this.spinner.show();
    this.store.dispatch(adminActions.setAssignTeamsAccessToUserLoadingState({ loadingState: LoadingState.Loading }));
    const url = `${environment.USER_TEAM_API}/${action.userId}`;
    const parameter = action.teams;
    return <any>this.http.apiPostRequest(url, parameter, false)
      .pipe(catchError((error) => {
        this.spinner.hide();
        return of(this.store.dispatch(adminActions.setAssignTeamsAccessToUserLoadingState({ loadingState: LoadingState.Error })));
      }));
  }

  removeUserAccess(action: any): Observable<AdminState> {
    this.spinner.show();
    this.store.dispatch(adminActions.setRemoveUserAccessLoadingState({ loadingState: LoadingState.Loading }));
    const url = `${environment.USER_TEAM_API}/${action.teamId}`;
    const parameter = `?user=${action.userId}`;
    return <any>this.http.apiDeleteRequest(url, parameter, false)
      .pipe(catchError((error) => {
        this.spinner.hide();
        return of(this.store.dispatch(adminActions.setRemoveUserAccessLoadingState({ loadingState: LoadingState.Error })));
      }));
  }

  fetchUserDetail(action: any): Observable<AdminState> {
    this.spinner.show();
    this.store.dispatch(adminActions.setUserDetailLoadingState({ loadingState: LoadingState.Loading }));
    const url = `${environment.USERS_API}/${action.userId}`;
    return <any>this.http.apiGetRequest(url)
      .pipe(catchError((error) => {
        this.spinner.hide();
        return of(this.store.dispatch(adminActions.setUserDetailLoadingState({ loadingState: LoadingState.Error })));
      }));
  }

  fetchBillingStrategy(action: any): Observable<AdminState> {
    this.store.dispatch(adminActions.setBillingStrategyLoadingState({ loadingState: LoadingState.Loading }));
    const url = `${environment.GET_BILLING_STRATEGY}`;
    return <any>this.http.apiGetRequest(url)
      .pipe(catchError((error) => {
        return of(this.store.dispatch(adminActions.setBillingStrategyLoadingState({ loadingState: LoadingState.Error })));
      }));
  }


  fetchTeams(action: any): Observable<Team[]> {
    this.store.dispatch(adminActions.setKhojiTeamsLoadingState({ loadingState: LoadingState.Loading }));
    const url = environment.TEAMS_API;
    return <any>this.http.apiGetRequest(url)
      .pipe(
        takeUntil(
          this.actions$.pipe(
            ofType(
              actions.discardSentCallsAfterNavigate
            )
          )
        ),
        catchError((error) => {
          this.store.dispatch(adminActions.setKhojiTeamsLoadingState({ loadingState: LoadingState.Error }));
          return of(this.store.dispatch(fetchError()));
        })
      );
  }

  fetchMembers(action: any): Observable<Member[]> {
    this.spinner.show();
    const url = environment.MEMBERS_API;
    return <any>this.http.apiGetRequest(url)
      .pipe(catchError((error) => {
        this.spinner.hide();
        return of(this.store.dispatch(fetchError()));
      }));
  }


  fetchRoles(action: any): Observable<Role> {
    this.spinner.show();
    this.store.dispatch(adminActions.rolesLoadingState({ loadingState: LoadingState.Loading }))
    const url = environment.ROLES_API;

    return <any>this.http.apiGetRequest(url)
      .pipe(catchError((error) => {
        this.spinner.hide();
        this.store.dispatch(adminActions.rolesLoadingState({ loadingState: LoadingState.Error }))
        return of(this.store.dispatch(fetchError()));
      }));
  }

  dispatchUsers(response: any, selectUserIds: string[]) {
    if (response === undefined) {
      return fetchError();
    }
    this.store.dispatch(adminActions.setUsers({ users: response }));

    if (selectUserIds && selectUserIds.length) {
      this.store.dispatch(adminActions.setJiraSelectedUserIds({ ids: selectUserIds }));
    }

    return adminActions.setUsersLoadingState({ loadingState: LoadingState.Done });
  }


  dispatchUsersAgainsMembers(response: any) {
    this.spinner.hide();
    if (response === undefined) {
      this.store.dispatch(adminActions.fetchUsersAgainstsMemberIdsLoadingState({ loadingState: LoadingState.Error }));
      return fetchError();
    }
    this.store.dispatch(adminActions.setUsersAgainstsMemberIds({ users: response }));
    return adminActions.fetchUsersAgainstsMemberIdsLoadingState({ loadingState: LoadingState.Done });
  }

  dispatchBasicUsers(response: any) {
    if (response === undefined) {
      return fetchError();
    }

    this.spinner.hide();
    this.store.dispatch(adminActions.setBasicUsersLoadingState({ loadingState: LoadingState.Done }));
    return adminActions.setBasicUsers({ users: response });
  }

  dispatchUsersAccessToTeams(response: any) {
    if (response === undefined) {
      return fetchError();
    }

    this.spinner.hide();
    this.store.dispatch(adminActions.setAssignTeamsAccessToUserLoadingState({ loadingState: LoadingState.Done }));
    this.showToastMessage("message", "success", "Success!", "Changes were saved successfully.");
    return adminActions.setUserDetail({ userDetail: response });
  }

  dispatchRemoveUsersAccessToTeams(response: any) {
    if (response === undefined) {
      return fetchError();
    }

    this.spinner.hide();
    this.store.dispatch(adminActions.setRemoveUserAccessLoadingState({ loadingState: LoadingState.Done }));
    this.showToastMessage("message", "success", "Success!", "Changes were saved successfully.");
    return adminActions.setUserDetail({ userDetail: response });
  }

  showToastMessage(key: string, severity: string, summary: string, detail: string) {
    this.messageService.clear('message');
    this.messageService.add({
      key: key,
      severity: severity,
      summary: summary,
      detail: detail
    });
  }

  dispatchUserDetail(response: any) {
    if (response === undefined) {
      return fetchError();
    }

    this.spinner.hide();
    this.store.dispatch(adminActions.setUserDetailLoadingState({ loadingState: LoadingState.Done }));
    return adminActions.setUserDetail({ userDetail: response });
  }

  dispatchBillingStrategy(response: any) {
    if (response === undefined) {
      return fetchError();
    }

    this.store.dispatch(adminActions.setBillingStrategyLoadingState({ loadingState: LoadingState.Done }));
    return adminActions.setBillingStrategy({ billingStrategy: response });
  }

  dispatchTeams(teamsList: Team[]) {

    if (teamsList === undefined) {
      return fetchError();
    }

    this.store.dispatch(adminActions.setKhojiTeamsLoadingState({ loadingState: LoadingState.Done }));
    // used in worklog
    this.store.dispatch(actions.setWorklogTeamsList({ list: teamsList }));
    // used in admin panel
    return adminActions.setKhojiTeamsList({ khojiTeamsList: teamsList });
  }

  dispatchOrganizations(organizations: Organization[]) {
    if (organizations === undefined) {
      return fetchError();
    }
    this.spinner.hide();
    return adminActions.setOrganizationsList({ organizationsList: organizations });
  }

  dispatchMembers(members: Member[]) {
    if (members === undefined) {
      return fetchError();
    }
    this.spinner.hide();
    return adminActions.setMembersList({ membersList: members });
  }

  dispatchTeamBoards(teamboards: Teamboard[]) {
    if (teamboards === undefined) {
      return fetchError();
    }
    this.spinner.hide();
    return adminActions.setTeamboardsList({ teamboardsList: teamboards });
  }

  dispatchRoles(response: any) {
    if (response === undefined) {
      return fetchError();
    }

    this.spinner.hide();
    this.store.dispatch(adminActions.rolesLoadingState({ loadingState: LoadingState.Done }))
    return adminActions.setRoles({ roles: response });
  }

  showInviteAgainToast(res: any): any {
    if (res === undefined) {
      this.trackingService.captureUserActionResult(AdminActions.UserInviteAgain, 'Failure');
      return fetchError();
    }

    this.trackingService.captureUserActionResult(AdminActions.UserInviteAgain, 'Success');
    this.messageService.clear('message');
    this.messageService.add({
      key: 'message',
      severity: 'success',
      summary: "Success!",
      detail: "The invitation has been sent to '" + res.member.fullName + "' successfully."
    });
  }

  showrevokeAccessToast(res: any): any {
    if (res === undefined) {
      this.trackingService.captureUserActionResult(AdminActions.ManageUsers.MenuButtonOnUserRow.SuspendUserAccess.ConfrimButton, 'Failure');
      return fetchError();
    }

    const userStatus = {
      userId: res["id"],
      updatedUser: res
    };
    this.store.dispatch(actions.setUpdatedUser({ updatedUser: userStatus }));
    this.store.dispatch(adminActions.updateUsersState({ users: [res] }));
    this.trackingService.captureUserActionResult(AdminActions.ManageUsers.MenuButtonOnUserRow.SuspendUserAccess.ConfrimButton, 'Success');
    this.messageService.clear('message');

    this.messageService.add({
      key: 'message',
      severity: 'success',
      summary: "Success!",
      detail: `${res.member.fullName}'s access has been suspended successfully.`
    });

    this.store.dispatch(updateUserAccessCountOnRevoke({ value: -1 }));
    this.spinner.hide();
  }

  showAccessEnabledToast(res: any): any {
    if (res === undefined) {
      this.trackingService.captureUserActionResult(AdminActions.ManageUsers.MenuButtonOnUserRow.RestoreUserAccess, 'Failure')
      return fetchError();
    }

    const userStatus = {
      userId: res["id"],
      updatedUser: res
    };

    this.store.dispatch(actions.setUpdatedUser({ updatedUser: userStatus }));
    this.store.dispatch(adminActions.updateUsersState({ users: [res] }));
    this.trackingService.captureUserActionResult(AdminActions.ManageUsers.MenuButtonOnUserRow.RestoreUserAccess, 'Success')
    this.messageService.clear('message');

    this.messageService.add({
      key: 'message',
      severity: 'success',
      summary: "Success!",
      detail: `${res.member.fullName}'s access has been restored successfully.`
    });

    this.store.dispatch(updateUserAccessCountOnRevoke({ value: 1 }));
    this.spinner.hide();
  }

  showUserUpdatedToast(res: any, editingUserID?: string): any {
    if (res === undefined) {
      this.trackingService.captureUserActionResult(AdminActions.UserUpdated, 'Failure');
      this.store.dispatch(emailUpdatedStatus({ success: false }));
      return fetchError();
    }

    this.store.dispatch(adminActions.fetchUsers({}));

    const userStatus = {
      userId: res["id"],
      updatedUser: res
    };
    this.store.dispatch(actions.setUpdatedUser({ updatedUser: userStatus }));
    this.store.dispatch(emailUpdatedStatus({ success: true }));

    if (editingUserID === userStatus.userId) {
      this.store.dispatch(actions.fetchUserSetting({ force: true }));
    }

    this.trackingService.captureUserActionResult(AdminActions.UserUpdated, 'Success');
    this.messageService.clear('message');
    this.messageService.add({
      key: 'message',
      severity: 'success',
      summary: "Success!",
      detail: "User " + res.member.fullName + " updated successfully"
    });
  }

  editUserInBulkShowToast(res: any, isBulkEdit: boolean) {
    if (isBulkEdit) this.spinner.hide();
    if (res === undefined) {
      this.store.dispatch(adminActions.setEditUserInBulkLoadingState({ loadingState: LoadingState.Error }));

      if (isBulkEdit) {
        this.trackingService.captureUserActionResult(AdminActions.ManageUsers.AssignRoleToUsers.Update, "Failure");
      } else {
        this.trackingService.captureUserActionResult(AdminActions.ManageUsers.EditUser.SaveEditUser, "Failure");
      }
      return fetchError();
    }
    this.store.dispatch(adminActions.setEditUserInBulkLoadingState({ loadingState: LoadingState.Done }));
    if (isBulkEdit) {
      this.trackingService.captureUserActionResult(AdminActions.ManageUsers.AssignRoleToUsers.Update, "Success");
    } else {
      this.trackingService.captureUserActionResult(AdminActions.ManageUsers.EditUser.SaveEditUser, "Success");
    }
    this.store.dispatch(adminActions.updateUsersState({ users: res }));


    this.messageService.clear('message');
    this.messageService.add({
      key: 'message',
      severity: 'success',
      summary: "Success!",
      detail: "Changes have been saved successfully."
    });
    return actions.dummyAction();
  }

  showEmailUpdatedToast(res: any): any {
    if (res === undefined) {
      this.trackingService.captureUserActionResult(AdminActions.UserUpdated, 'Failure');
      this.store.dispatch(emailUpdatedStatus({ success: false }));
      return fetchError();
    }

    this.trackingService.captureUserActionResult(AdminActions.UserUpdated, 'Success');

    const userStatus = {
      userId: res["id"],
      updatedUser: res
    };
    this.store.dispatch(emailUpdatedStatus({ success: true }));
    this.store.dispatch(actions.setUpdatedUser({ updatedUser: userStatus }));

    this.messageService.clear('message');
    this.messageService.add({
      key: 'message',
      severity: 'success',
      summary: "Success!",
      detail: `User '${res.member.fullName}' has been updated and email sent successfully.`
    });
  }

  showToast(res: any, action: any): any {
    if (res === undefined) {
      this.trackingService.captureUserActionResult(AdminActions.NewUserInvited, 'Failure');
      return fetchError();
    }

    this.trackingService.captureUserActionResult(AdminActions.NewUserInvited, 'Success');

    this.messageService.clear('message');
    this.messageService.add({
      key: 'message',
      severity: 'success',
      summary: "Success!",
      detail: `The invitation has been sent to '${action.userInvite.firstName} ${action.userInvite.lastName}' successfully.`
    });

    if (!this.feature.isEnabled(this.constants.NEW_TENANT_ADMIN_DASHBOARD_KEY)) {
      return this.store.dispatch(adminActions.postSuccessFulUserCreation());
    }

  }

  showSupervisorAssignedToast(res) {
    if (res === undefined) {
      this.trackingService.captureUserActionResult(AdminActions.AssignSupervisorsInBulk, 'Failure');
      return fetchError();
    }
    this.showToastMessage("message", "success", "Success!", "Changes were saved successfully.");
    this.trackingService.captureUserActionResult(AdminActions.AssignSupervisorsInBulk, 'Success');
    this.store.dispatch(adminActions.setAssignSupervisorsLoadingState({ loadingState: LoadingState.Done }));
    this.store.dispatch(fetchKhojiTeamsList());
  }

  showTeamDeletedToast(res: any, action: any): any {
    const userAction = action.ids.length > 1 ? AdminActions.TeamDeletedBulk : AdminActions.TeamDeleted;
    this.spinner.hide();
    if (res === undefined) {
      this.trackingService.captureUserActionResult(userAction, 'Failure');
      return fetchError();
    }
    this.store.dispatch(adminActions.setDeleteTeamsLoadingState({ loadingState: LoadingState.Done }));
    this.store.dispatch(fetchKhojiTeamsList());

    this.trackingService.captureUserActionResult(userAction, 'Success');
    this.messageService.clear('message');
    this.messageService.add({
      key: 'message',
      severity: 'success',
      summary: "Success!",
      detail: "The team have been deleted successfully."
    });
    return this.store.dispatch(adminActions.postSuccessTeamDeletion());
  }

  showTeamToast(res: any, action: any): any {
    this.spinner.hide();
    if (res === undefined) {
      this.trackingService.captureUserActionResult(AdminActions.TeamCreated, 'Failure');
      return fetchError();
    }

    this.store.dispatch(adminActions.setCreateTeamsLoadingState({ loadingState: LoadingState.Done }));

    this.trackingService.captureUserActionResult(AdminActions.TeamCreated, 'Success');
    this.messageService.clear('message');
    this.messageService.add({
      key: 'message',
      severity: 'success',
      summary: "Success!",
      detail: `Team '${action.teamData.teamName}' has been created successfully.`
    });

    return this.store.dispatch(adminActions.postSuccessTeamCreation());
  }

  showTeamUpdatedToast(res: any, action: any): any {
    this.spinner.hide();
    if (res === undefined) {
      this.trackingService.captureUserActionResult(AdminActions.ManageTeams.EditTeam.UpdateTeam, 'Failure');
      return fetchError();
    }

    this.store.dispatch(adminActions.setUpdateTeamLoadingState({ loadingState: LoadingState.Done }));

    this.trackingService.captureUserActionResult(AdminActions.ManageTeams.EditTeam.UpdateTeam, 'Success');
    this.messageService.clear('message');
    this.messageService.add({
      key: 'message',
      severity: 'success',
      summary: "Success!",
      detail: `Team '${action.teamData.teamName}' has been updated successfully.`
    });
  }

  fetchCategoryConfig(action: any): Observable<CategoryConfig> {
    this.spinner.show();
    const url = environment.CATEGORY_CONFIGS_API;
    this.store.dispatch(adminActions.setCategoryConfigLoadingState({ loadingState: LoadingState.Loading }));

    this.spinner.hide();

    return <any>this.http.apiPostRequest(url, action.sourceSystem, false)
      .pipe(catchError((error) => {
        this.spinner.hide();
        return of(this.store.dispatch(adminActions.setCategoryConfigLoadingState({ loadingState: LoadingState.Error })));
      }));
  }

  fetchSourceUsers(action: any): Observable<ProjectIntegrationUser[]> {
    const url = environment.SOURCE_USERS_API;
    this.store.dispatch(adminActions.setSourceUsersLoadingState({ loadingState: LoadingState.Loading }));

    return <any>this.http.apiPostRequest(url, action.sourceSystem, false)
      .pipe(catchError((error) => {
        return of(this.store.dispatch(adminActions.setSourceUsersLoadingState({ loadingState: LoadingState.Error })));
      }));
  }

  dispatchSourceTeamboards(response: any) {
    if (response === undefined) {
      return fetchError();
    }

    this.spinner.hide();
    this.store.dispatch(adminActions.setSourceTeamboardsLoadingState({ loadingState: LoadingState.Done }));
    return adminActions.setSourceTeamboards({ teamboards: response });
  }


  dispatchSourceSystemInfo(response: any, action: any) {
    if (response === undefined) {
      this.wizardService.completeStep(action.wizard, action.stepToComplete, false);
      this.spinner.hide();
      return fetchError();
    }
    this.spinner.hide();
    this.wizardService.completeStep(action.wizard, action.stepToComplete, true);
    this.wizardService.gotoNextStep(action.wizard);
    // this.wizardService.gotoStep(wizardConfig.wizard, wizardConfig.steps.SOURCE_MAPPINGS);
    return adminActions.setSourceSystem({ sourceSystem: action.sourceSystem });
  }

  dispatchSourceProjects(response: any, action: any) {
    this.spinner.hide();

    if (response === undefined) {
      return fetchError();
    }

    this.store.dispatch(adminActions.setSourceProjectsLoadingState({ loadingState: LoadingState.Done }));
    return adminActions.setSourceProjects({ projects: response });
  }

  dispatchCategoryConfig(response: CategoryConfig, action: any) {
    this.spinner.hide();

    if (response === undefined) {
      return fetchError();
    }

    this.store.dispatch(adminActions.setCategoryConfigLoadingState({ loadingState: LoadingState.Done }));
    return adminActions.setCategoryConfig({ categoryConfig: response });
  }

  dispatchSourceUsers(response: any, action: any) {

    if (response === undefined) {
      return fetchError();
    }

    this.store.dispatch(adminActions.setSourceUsersLoadingState({ loadingState: LoadingState.Done }));
    return adminActions.setSourceUsers({ users: new UserListMapperPipe().transform(response) });
  }

  dispatchSourceCustomFields(response: any, action: any) {
    this.spinner.hide();

    if (response === undefined) {
      return fetchError();
    }

    this.store.dispatch(adminActions.setSourceCustomFieldsLoadingState({ loadingState: LoadingState.Done }));
    return adminActions.setSourceCustomFields({ customFields: response });
  }


  postLoginWithAtlassian(action: TypedAction<"[Admin State] LoginWithAtlassian">) {
    const url = environment.LOGIN_API_KBS;
    const data = action['data'];
    this.store.dispatch(adminActions.setLoginWithAtlassianLoadingState({ loadingState: LoadingState.Loading }));

    return this.http.apiPostRequestCustom(url, data, data)
      .pipe(catchError((error) => {
        return of(this.store.dispatch(adminActions.setLoginWithAtlassianLoadingState({ loadingState: LoadingState.Error })));
      }));
  }

  dispatchLoginWithAtlassian(response: any) {
    if (response === undefined) {
      this.store.dispatch(adminActions.setLoginWithAtlassianLoadingState({ loadingState: LoadingState.Error }));
      return fetchError();
    }

    this.store.dispatch(adminActions.setLoginWithAtlassianLoadingState({ loadingState: LoadingState.Done }));
    return adminActions.setLoginWithAtlassianResponse({ response: response });
  }

  saveUserPreference(action) {
    const url = environment.USER_PREFERENCE;
    return <Observable<string>>this.http.apiPostRequest(url, 
      { 
        "LEAVES": {
          ticketId: action.ticketID
        }
      }
      , false)
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
          return of(this.store.dispatch(fetchError()));
        })
      );
  }

  showSuccessToastOnUserPreference(response: any, action): Observable<any> {
    if (response === undefined) {
      return of(fetchError());
    }
    if(action.showToast)
    {
      this.showToastMessage("message", "success", "Success!", "User Preference updated successfully.");
    }
    //Cant do this because it reloads the page
    //this.store.dispatch(fetchInstanceUserMetaData());
    return of(actions.dummyAction());
  }
}

