import { AccessLevels } from './../../states/app-states';
import { animate, style, transition, trigger } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { selectTeamsList } from 'app/admin/state/admin.selector';
import { Constants } from 'app/constants';
import { MemberWorklog, TeamWorklog, TeamWorklogStatistics } from 'app/interface/team-worklog-stats';
import { ExportService } from 'app/services/export.service';
import { TrackingService, UserActions } from 'app/services/tracking';
import { getCurrentInstance, getCurrentWorkspace, observableToPromise } from 'app/shared/helper-functions';
import { MemberWorklogPercentage } from 'app/shared/picklist/interfaces';
import { AppState, LoadingState } from 'app/states/app-states';
import { fetchWorkSpaces, setWorklogTeamsFilter } from 'app/states/app.actions';
import { selectWorkLogGeneralSettings } from 'app/states/global-configs.selector';
import { selectWorklogTeamsSelectedByFilter } from 'app/states/global-filters.selector';
import { selectTeamWorklogLoadingState, selectWorkLogCategorizationFeatureUnlockLoadingState } from 'app/states/global-process.selector';
import { selectTeamWorklogStats } from 'app/states/global-statistics.selector';
import { selectTranslation } from 'app/states/global-translations.selector';
import { dispatchWorkLogCategorizationFeatureUnlock } from 'app/user-profile/state/user-profile.actions';
import { selectUserProfile, selectWorkspacesWithLoadingStates, workLogCategorizationEnabledSelector } from 'app/user-profile/state/user-profile.selectors';
import { Features } from 'app/user-profile/state/user-profile.states';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { BehaviorSubject, combineLatest, Observable, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { TeamWorklogModule } from '../team-worklog.module';

@Component({
  selector: 'khoji-team-worklog-summary',
  standalone: true,
  imports: [
    CommonModule,
    TableModule,
    ButtonModule,
    DialogModule,
    TeamWorklogModule
  ],
  templateUrl: './team-worklog-summary.component.html',
  styleUrls: ['./team-worklog-summary.component.scss'],
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('0.5s ease-in', style({ opacity: 1 }))
      ]),
    ])
  ]
})
export class TeamWorklogSummaryComponent implements OnInit, OnDestroy {
  translation$: Observable<any>;
  teamWorklogLoadingState$: Observable<LoadingState>;
  teamWorklogs$: Observable<TeamWorklog[]>;
  memberWorklogs$: Observable<MemberWorklog[]>;
  generalSettings$: Observable<{ productiveAlias: string; nonProductiveAlias: string; }>;
  worklogTeamsSelected$: Observable<string[]>;
  categorizationEnabledSubject = new BehaviorSubject<boolean>(false); // Default initial value
  categorizationEnabled$: Observable<boolean> = this.categorizationEnabledSubject.asObservable();
  colsTeamWorklog = ['Team name', 'Work log (%)', 'Total capacity', 'Logged days'];
  colsMemberWorklog = ['Name', 'Role', 'Work log (%)'];
  showRemindTeamModal: boolean = false;
  teamNameForReminder: string = '';
  unlockButtonClicked: boolean = false;
  supervisorId: number = 0;

  teamReminderMap: Map<string, boolean> = new Map();

  teamSupervisorMap: Map<string, boolean> = new Map();


  private subscription = new Subscription();

  instanceOwnerEmail: string = "";

  // Inputs
  @Input() exportFileName = 'Team View Detail';
  constants = Constants;
  isUserSupervisor: boolean;
  removeCategorizationUnlock = true;

  constructor(
    private store: Store<AppState>,
    private trackingService: TrackingService,
    private exportService: ExportService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.translation$ = this.store.pipe(selectTranslation);
    this.teamWorklogs$ = this.store.pipe(
      selectTeamWorklogStats,
      map((stats: TeamWorklogStatistics) => {
        return stats.teamWorklogs;
      })
    );

    this.subscription.add(this.store.pipe(selectUserProfile).subscribe(
      data => {
        this.instanceOwnerEmail = data.khojiUserProfile.email;
      })
    );

    this.subscription.add(
      this.store.pipe(selectWorkspacesWithLoadingStates).subscribe(workSpaceWithLoadingState => {
        if (workSpaceWithLoadingState.loadingState === LoadingState.Done) {
          const matchingWorkspace = workSpaceWithLoadingState.workspaces[0];
          const matchingInstance = matchingWorkspace.instances.find(i => i.id === Number(getCurrentInstance()));
          const userAcess = matchingInstance.instanceUser.accessLevelCode;
          this.removeCategorizationUnlock = userAcess !== AccessLevels.TenantAdmin;
        }
      })
    )

    const selectedTeamList$ = this.store.pipe(selectTeamsList);

    this.subscription.add(combineLatest([selectedTeamList$, this.teamWorklogs$]).subscribe(([teamList, worklogStats]) => {
      teamList.forEach((team) => {
        if (team.teamName) {
          const supervisor = team.supervisors?.find(supervisor => supervisor.memberEmail === this.instanceOwnerEmail);

          if (supervisor) {
            this.supervisorId = supervisor.id;
          }

          this.teamSupervisorMap.set(team.teamName, !!supervisor);

          this.setTeamReminderMap(worklogStats);
        }
      });
    })
    );

    this.memberWorklogs$ = this.teamWorklogs$.pipe(
      map((teamWorklogs: TeamWorklog[]) => teamWorklogs.flatMap(team => team.memberWorklogs))
    );

    const workLogCategorizationEnabled$ = this.store.select(workLogCategorizationEnabledSelector);
    this.subscription.add(workLogCategorizationEnabled$.subscribe(workLogCategorizationEnabled => {
      this.categorizationEnabledSubject.next(workLogCategorizationEnabled);
    }));

    this.worklogTeamsSelected$ = this.store.pipe(selectWorklogTeamsSelectedByFilter);
    this.generalSettings$ = this.store.pipe(selectWorkLogGeneralSettings);
    this.teamWorklogLoadingState$ = this.store.pipe(selectTeamWorklogLoadingState);

    const featureUnlockLoadingState$ = this.store.pipe(selectWorkLogCategorizationFeatureUnlockLoadingState);
    this.subscription.add(
      featureUnlockLoadingState$.subscribe(loadingState => {
        if (loadingState === LoadingState.Done) {
          this.store.dispatch(fetchWorkSpaces());
          this.router.navigate([`/space/${getCurrentWorkspace()}/instance/${getCurrentInstance()}/work-log-categorization`]);
        }
        if (loadingState === LoadingState.Error) this.unlockButtonClicked = false;
      })
    );
  }

  getMembersWorklogPercentages(worklog: TeamWorklog): MemberWorklogPercentage[] {
    const uniqueMembers = new Map<string, MemberWorklogPercentage>();

    worklog.memberWorklogs.forEach(member => {
      const existing = uniqueMembers.get(member.memberName);

      uniqueMembers.set(member.memberName, {
        memberName: member.memberName,
        percentage: existing ? Math.max(existing.percentage, member.percentage) : member.percentage
      });
    });

    return Array.from(uniqueMembers.values());
  }


  setTeamReminderMap(worklogs: TeamWorklog[]) {
    worklogs.forEach(teamWorklog => {
      let worklogss = this.getMembersWorklogPercentages(teamWorklog);
      const counts: Record<string, number> = {
        Missing: 0,
        Incomplete: 0,
        Completed: 0
      };

      worklogss.forEach(member => {
        let title: string;

        if (member.percentage === 0) {
          title = this.constants.MISSING;
        } else if (member.percentage > 0 && member.percentage < 100) {
          title = this.constants.INCOMPLETE;
        } else if (member.percentage === 100) {
          title = this.constants.COMPLETED;
        }

        if (counts[title] !== undefined) {
          counts[title]++;
        }
      });

      let isRemindTeamVisible = counts[this.constants.MISSING] > 0 || counts[this.constants.INCOMPLETE] > 0;
      const isSupervisor = this.teamSupervisorMap.get(teamWorklog.teamName);

      isRemindTeamVisible = isRemindTeamVisible && isSupervisor;
      this.teamReminderMap.set(teamWorklog.teamName, isRemindTeamVisible);
    })
  }

  async exportMemberWorklogCsv() {
    this.trackingService.captureUserAction(UserActions.Worklog.WorkLogDetailsExportAsCsv);
    // cols: ['Mame', 'Role', 'Worklog (%)', 'Main', 'Others']
    // 'Main' and 'Others' are included/excluded based on the categorization enabled or not
    // Instead of 'Main' and 'Others' we are using alias names from general settings
    const header = this.colsMemberWorklog
    const categorizationEnabled = await observableToPromise(this.categorizationEnabled$);
    const { productiveAlias, nonProductiveAlias } = await observableToPromise(this.generalSettings$);
    const data =
      await observableToPromise(this.memberWorklogs$.pipe(
        map(memberWorklogs => memberWorklogs.map(mwl => ({
          [header[0]]: mwl.memberName,
          [header[1]]: mwl.roleName,
          [header[2]]: `${mwl.percentage.toFixed(2)}%`,
          ...(categorizationEnabled ? {
            [productiveAlias]: `${mwl.mainPercentage.toFixed(2)}%`,
            [nonProductiveAlias]: `${mwl.othersPercentage.toFixed(2)}%`
          } : {})
        })))
      ));
    this.exportService.exportCsv(data, this.exportFileName);
  }

  async exportTeamWorklogCsv() {
    // cols: ['Team name', 'Worklog (%)', 'Total capacity', 'Logged days', 'Main', 'Others']
    // 'Main' and 'Others' are included/excluded based on the categorization enabled or not
    // Instead of 'Main' and 'Others' we are using alias names from general settings
    const header = this.colsTeamWorklog
    const categorizationEnabled = await observableToPromise(this.categorizationEnabled$);
    const { productiveAlias, nonProductiveAlias } = await observableToPromise(this.generalSettings$);

    const data =
      await observableToPromise(this.teamWorklogs$.pipe(
        map(teamWorklogs => teamWorklogs.map(twl => ({
          [header[0]]: twl.teamName,
          [header[1]]: `${twl.percentage.toFixed(2)}%`,
          [header[2]]: twl.totalAvailableDays.toFixed(2),
          [header[3]]: twl.totalWorkLogInDays.toFixed(2),
          ...(categorizationEnabled ? {
            [productiveAlias]: `${twl.totalMainPercents.toFixed(2)}%`,
            [nonProductiveAlias]: `${twl.totalOthersPercents.toFixed(2)}%`
          } : {})
        })))
      ));

    this.exportService.exportCsv(data, this.exportFileName);
  }


  navigateToTeamWorklogDetails(team: string) {
    setTimeout(() => {
      const element = document.getElementById(Constants.TEAM_WORKLOG_DETAIL_TAB_ID);
      if (element) {
        element.click();
        this.store.dispatch(setWorklogTeamsFilter({ team }));
      }
    }, 100);
  }

  openWorklogReminderModalForTheTeam(teamName: string) {
    this.showRemindTeamModal = true;
    this.teamNameForReminder = teamName;
  }

  onModalClosed() {
    this.showRemindTeamModal = false;
  }

  unlockWorkLogCategorizationFeature() {
    if (this.unlockButtonClicked) return;
    this.unlockButtonClicked = true;
    const instanceId = Number(getCurrentInstance());
    if (!Number.isNaN(instanceId)) {
      this.store.dispatch(dispatchWorkLogCategorizationFeatureUnlock({ instanceId, featureId: Features.WORK_LOG_CATEGORIZATION }));
    }
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe()
  }
}
