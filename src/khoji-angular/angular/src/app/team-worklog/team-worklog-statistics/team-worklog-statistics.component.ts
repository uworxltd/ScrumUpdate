import { animate, style, transition, trigger } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, OnInit, Output, ViewChild } from '@angular/core';
import { Store } from '@ngrx/store';
import { selectTeamsList } from 'app/admin/state/admin.selector';
import { Constants } from 'app/constants';
import { TeamWorklogStatistics } from 'app/interface/team-worklog-stats';
import { ChartComponent } from 'app/shared/chart/chart.component';
import { MemberWorklogPercentage, WorklogStatusItem } from 'app/shared/picklist/interfaces';
import { AppState, LoadingState } from 'app/states/app-states';
import { selectUnassignedWorklogLegendsCount, selectWorkLogGeneralSettings } from 'app/states/global-configs.selector';
import { selectTeamWorklogStats } from 'app/states/global-statistics.selector';
import { selectTranslation } from 'app/states/global-translations.selector';
import { selectUserProfile, selectWorkspacesLoadingState, workLogCategorizationEnabledSelector } from 'app/user-profile/state/user-profile.selectors';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { TooltipModule } from 'primeng/tooltip';
import { combineLatest, Subscription } from 'rxjs';
import { TeamWorklogSelectionComponent } from '../team-worklog-selection/team-worklog-selection.component';
import { TeamWorklogModule } from '../team-worklog.module';
import { selectWorklogTeamsFilter, selectWorklogTeamsSelectedByFilter } from 'app/states/global-filters.selector';
import { getElementWidth } from 'app/shared/helper-functions';
import { TrackingService, UserActions } from 'app/services/tracking';
import { WorklogSettingsComponent } from "../worklog-settings/worklog-settings.component";
import { fetchConfigs, fetchInstanceDetails, fetchKhojiConfigs, fetchMembers, fetchTeamWorklogStats } from 'app/states/app.actions';
import { INCLUDE_WEEKENDS_IN_WORKLOG_STATS, OTHERS_WORKLOG_EMAIL_SUBSCRIPTION_THRESHOLD, WORKLOG_DAY_HOUR_CONFIG, WORKLOG_MAIN_CATEGORIES_ALIAS, WORKLOG_OTHER_CATEGORIES_ALIAS } from 'app/constants.configs';
import { CacheService } from 'app/caching/cache.service';
import { ConfirmationService } from 'primeng/api';
import { ConfirmPopupModule } from 'primeng/confirmpopup';

@Component({
  selector: 'khoji-team-worklog-statistics',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    DividerModule,
    TeamWorklogModule,
    ButtonModule,
    DialogModule,
    TeamWorklogSelectionComponent,
    TooltipModule,
    WorklogSettingsComponent,
    ConfirmPopupModule,
  ],
  templateUrl: './team-worklog-statistics.component.html',
  styleUrls: ['./team-worklog-statistics.component.scss'],
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('0.5s ease-in', style({ opacity: 1 }))
      ]),
    ])
  ]
})

export class TeamWorklogStatisticsComponent extends ChartComponent implements OnInit {
  selectedTeam: { avgDays: {}; avgPercents: {}; percentage: number; memberWorklogs: { roleName: string; workLogDistribution: any; memberName: string; thresholdColor: string; email: string; accountId: string; inMultipleTeams: boolean; totalMainDays: { [column: string]: number; }; totalMainPercents: { [column: string]: number; }; totalOthersDays: { [column: string]: number; }; totalOthersPercents: { [column: string]: number; }; totalAvailableDays: number; percentage: number; mainPercentage: number; othersPercentage: number; }[]; teamName: string; thresholdColor: string; memberWorklogColumns: { main: string[]; other: string[]; }; totalAvailableDays: number; totalWorkLogInHours: number; totalWorkLogInDays: number; totalMainDays: number; totalOthersDays: number; totalMainPercents: number; totalOthersPercents: number; }[];
  @ViewChild('worklogSettingsComponent') worklogSettingsComponent: WorklogSettingsComponent;
  @Output() navigateToDetailsTab = new EventEmitter<void>();
  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.wrapContainer = getElementWidth('.flex-container') < 809;
    this.wrapWorklogStatusItem = getElementWidth('.worklog-status-container') < 548;
  }

  subscription = new Subscription();
  worklog: MemberWorklogPercentage[] = [];
  workLogStatusItem: WorklogStatusItem[] = [];
  constants = Constants;
  showRemindTeamModal: boolean = false;
  selectedCategory: string = 'Summary';
  isWorklogCategoryEnabled: boolean = false;
  productiveAlias: string = '';
  nonProductiveAlias: string = '';
  instanceOwnerEmail: String = "";
  supervisorId: number = -1;
  isUserSupervisor: boolean = false;
  showRemindTeamButton: boolean = false;
  multiTeams = false;
  unassignedWorklogLegendsCount: number = 5;
  teamSupervisorMap: Map<string, boolean> = new Map();
  wrapContainer = false;
  wrapWorklogStatusItem = false;
  isSupervisor = false;
  displayWorklogSettings = false;
  worklogSettingsUpdated = false;
  isAdminOrTenantAdmin = false;
  workspacesLoadingState = LoadingState.Pending;
  loadingState = LoadingState;

  tooltipContent = `Work log status indicates the progress of logged hours for each team member.<ul style="margin:0;padding-left:24px"><li><b>Missing</b>: 0% of work logged.</li><li><b>Incomplete</b>: Partial work logged (between 1% and 99%).</li><li><b>Completed</b>: 100% of work logged.</li></ul>`;

  setCategory(category: string) {
    this.selectedCategory = category;
    this.trackingService.captureUserAction(UserActions.Worklog.WorklogStatsCategorySelected, { category });
  }

  constructor(public store: Store<AppState>, private cacheService: CacheService, private trackingService: TrackingService,
    private confirmationService: ConfirmationService,
  ) {
    super(store);
  }

  ngOnInit() {
    setTimeout(() => {
      this.onResize(null);
    }, 10);
    const worklog$ = this.store.pipe(selectTeamWorklogStats);
    const selectedTeamList$ = this.store.pipe(selectTeamsList);
    const worklogTeamsFilter$ = this.store.pipe(selectWorklogTeamsFilter);
    const worklogTeamsSelectedByFilter$ = this.store.pipe(selectWorklogTeamsSelectedByFilter);
    const unassignedWorklogLegendsCount$ = this.store.pipe(selectUnassignedWorklogLegendsCount);
    const translation$ = this.store.pipe(selectTranslation);
    const workspacesLoadingState$ = this.store.pipe(selectWorkspacesLoadingState);

    this.subscription.add(
      workspacesLoadingState$.subscribe(state => {
        this.workspacesLoadingState = state;
      })
    );

    this.subscription.add(
      worklogTeamsSelectedByFilter$.subscribe(teams => {
        this.multiTeams = teams.length > 1;
      })
    );

    this.subscription.add(
      worklog$.subscribe(worklog => {
        this.worklog = this.getMembersWorklogPercentages(worklog);
        const title = this.addTitlesToWorklogPercentages(this.worklog);
        this.workLogStatusItem = this.convertCountsToArray(title);
        this.selectedTeam = worklog.teamWorklogs;
      })
    );

    this.subscription.add(this.store.pipe(selectUserProfile).subscribe(data => {
      this.isAdminOrTenantAdmin = data.accessibleAccessLevels.includes('ADMIN') || data.accessibleAccessLevels.includes('TENANT_ADMIN');
      this.instanceOwnerEmail = data.khojiUserProfile.email;
    })
    );

    this.subscription.add(translation$.subscribe(data => {
      this.translation = data;
    }));

    this.subscription.add(
      combineLatest([selectedTeamList$, worklogTeamsFilter$]).subscribe(([teamList, worklogTeamsFilter]) => {
        const isNoSpecificTeamSelected = worklogTeamsFilter.every(filterTeam => !filterTeam.selected);
        const filteredTeams = teamList.filter(team =>
          worklogTeamsFilter.some(filterTeam => filterTeam.name === team.teamName)
        );

        this.isSupervisor = false;

        filteredTeams.forEach(team => {
          const isTeamSelected = isNoSpecificTeamSelected || worklogTeamsFilter.some(filterTeam => filterTeam.name === team.teamName && filterTeam.selected);

          if (isTeamSelected) {
            const supervisor = team.supervisors?.find(supervisor => supervisor.memberEmail === this.instanceOwnerEmail);

            if (supervisor) {
              this.isSupervisor = true;
              this.supervisorId = supervisor.id;
            }

            this.teamSupervisorMap.set(team.teamName, !!supervisor);
          }
        });
      })
    );

    const workLogCategorizationEnabled$ = this.store.select(workLogCategorizationEnabledSelector);

    this.subscription.add(workLogCategorizationEnabled$.subscribe(workLogCategorizationEnabled => {
      this.isWorklogCategoryEnabled = workLogCategorizationEnabled;
    }));

    this.subscription.add(unassignedWorklogLegendsCount$.subscribe(config => {
      this.unassignedWorklogLegendsCount = 5
    }));

    const generalSettings$ = this.store.pipe(selectWorkLogGeneralSettings);
    this.subscription.add(
      generalSettings$.subscribe(cfg => {
        this.productiveAlias = cfg.productiveAlias;
        this.nonProductiveAlias = cfg.nonProductiveAlias;
      })
    )
  }

  getMembersWorklogPercentages(worklog: TeamWorklogStatistics): MemberWorklogPercentage[] {
    const uniqueMembers = new Map<string, MemberWorklogPercentage>();

    worklog.teamWorklogs.forEach(teamWorklog => {
      teamWorklog.memberWorklogs.forEach(member => {
        const existing = uniqueMembers.get(member.memberName);

        uniqueMembers.set(member.memberName, {
          memberName: member.memberName,
          percentage: existing ? Math.max(existing.percentage, member.percentage) : member.percentage
        });
      });
    });

    this.worklog = Array.from(uniqueMembers.values());

    return this.worklog;
  }

  addTitlesToWorklogPercentages(memberPercentages: MemberWorklogPercentage[]): Record<string, number> {
    const counts: Record<string, number> = {
      Missing: 0,
      Incomplete: 0,
      Completed: 0
    };

    memberPercentages.forEach(member => {
      let title: string;

      if (member.percentage === 0) {
        title = this.constants.MISSING;
      } else if (member.percentage > 0 && member.percentage < 100) {
        title = this.constants.INCOMPLETE;
      } else if (member.percentage >= 100) {
        title = this.constants.COMPLETED;
      }

      if (counts[title] !== undefined) {
        counts[title]++;
      }
    });

    this.showRemindTeamButton = counts[this.constants.MISSING] > 0 || counts[this.constants.INCOMPLETE] > 0;

    return counts;
  }

  convertCountsToArray(counts: Record<string, number>): { title: string, count: number }[] {
    return Object.keys(counts).map(key => ({
      title: key,
      count: counts[key],
      icon: `assets/svg/${key}.svg`
    }));
  }

  toggleRemindTeamButtonState() {
    return false;
  }

  showWorklogSettings() {
    this.store.dispatch(fetchInstanceDetails());
    this.displayWorklogSettings = true;
  }

  onModalClosed() {
    this.showRemindTeamModal = false;
  }

  onConfigUpdated() {
    this.worklogSettingsUpdated = true;
  }

  handleWorklogSettingsClose({ target }) {
    if (this.worklogSettingsComponent.hasChanges()) {
      const message = this.translation?.worklogSettings.unsavedCategoriesWarningMessage;
      const acceptLabel = this.translation?.worklogSettings.unsavedCategoriesDiscardMessage;
      this.confirmationService.confirm({
        target,
        message,
        acceptLabel,
        rejectLabel: 'Cancel',
        accept: () => {
          this.worklogSettingsComponent?.resetChanges();
          this.displayWorklogSettings = false;
          this.saveChangesForWorklogSettings();
        },
        reject: () => {
          this.saveChangesForWorklogSettings();
        }
      });
    }
    else {
      this.saveChangesForWorklogSettings();
      this.displayWorklogSettings = false;
    }
  }

  saveChangesForWorklogSettings() {
    if (this.worklogSettingsUpdated) {
      this.cacheService.clearCache();
      this.store.dispatch(fetchKhojiConfigs());
      this.store.dispatch(fetchMembers());
      this.store.dispatch(fetchTeamWorklogStats());
      this.store.dispatch(fetchConfigs({ propKeys: [WORKLOG_MAIN_CATEGORIES_ALIAS, WORKLOG_OTHER_CATEGORIES_ALIAS, OTHERS_WORKLOG_EMAIL_SUBSCRIPTION_THRESHOLD, WORKLOG_DAY_HOUR_CONFIG, INCLUDE_WEEKENDS_IN_WORKLOG_STATS] }));
      this.worklogSettingsUpdated = false;
    }
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  navigateToTeamWorklogDetails() {
    this.navigateToDetailsTab.emit();
  }
}
