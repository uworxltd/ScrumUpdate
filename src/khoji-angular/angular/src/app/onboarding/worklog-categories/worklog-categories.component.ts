import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from "@angular/core";
import { Router } from "@angular/router";
import { Store } from "@ngrx/store";
import { Constants } from "app/constants";
import { ISSUE_SOURCE_TYPE_CONFIGS, WORKLOG_DISTRIBUTION } from 'app/constants.configs';
import { IssueType } from "app/interface/worklog-catagory";
import { WorklogConfigAction, WorklogConfigActionType } from "app/interface/worklog-config-action";
import { AdminActions, RootNav, TrackingService, UserActions } from "app/services/tracking";
import { ColorPickerComponent } from "app/shared/color-picker/color-picker.component";
import { getCurrentInstance, getCurrentWorkspace } from "app/shared/helper-functions";
import { PicklistItem, PicklistCategory } from 'app/shared/picklist/interfaces';
import { PicklistComponent } from "app/shared/picklist/picklist.component";
import { PicklistModule } from "app/shared/picklist/picklist.module";
import { SplitContainerComponent } from "app/shared/split-container/split-container.component";
import { StepsService } from "app/shared/steps/steps.service";
import { AppState, LoadingState } from "app/states/app-states";
import { fetchConfigs, fetchInstanceDetails, fetchMembers, fetchSourceIssueTypes, fetchTeamWorklogStats, fetchTeamWorklogStatsForThisMonth, updateConfig, worklogDistributionLoadingState } from 'app/states/app.actions';
import { selectConfigUpdated, selectIssueTypes, selectLastNumberOfDaysForRecentIssueTypes, selectServerConfig, selectUnassignedIssueTypes, selectWorkLogGeneralSettings, selectWorklogConfigSync } from 'app/states/global-configs.selector';
import { selectDateTo } from "app/states/global-filters.selector";
import { selectSourceIssueTypesLoadingState, selectupdateOnboardingTeamLoadingState, selectWorklogDistributionLoadingState } from "app/states/global-process.selector";
import { selectWorklogCategoriesTranslations } from "app/states/global-translations.selector";
import WorklogDistributionConfig from "app/types/worklog-distribution.config";
import { WorklogCategoryAliasesSettingsComponent } from "app/worklog-category-aliases-settings/worklog-category-aliases-settings.component";
import { MessageService } from "primeng/api";
import { ButtonModule } from "primeng/button";
import { DividerModule } from "primeng/divider";
import { TooltipModule } from "primeng/tooltip";
import { combineLatest, Subscription } from "rxjs";
import { filter } from "rxjs/operators";

export interface WorklogCategoriesTranslation {
    pageTitle: string;
    getStarted: string;
    doItLater: string,
    reset: string;
    save: string;
}
@Component({
    selector: 'khoji-worklog-categories',
    templateUrl: './worklog-categories.component.html',
    styleUrls: ['./worklog-categories.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        PicklistModule,
        ButtonModule,
        TooltipModule,
        SplitContainerComponent,
        WorklogCategoryAliasesSettingsComponent,
        DividerModule,
    ]
})
export class WorklogCategoriesComponent implements OnInit, OnDestroy {
    @ViewChild(PicklistComponent) picklist: PicklistComponent;
    @ViewChild(WorklogCategoryAliasesSettingsComponent) categoryAliasesComponent: WorklogCategoryAliasesSettingsComponent;
    @Input() pageTitle = 'Group issue types into categories to track {0} effort';
    @Input() pageSubtitle = '';
    @Input() saveButtonLabel = 'Save changes';
    @Output() categoriesUpdated = new EventEmitter<void>();
    @Output() categoryAliasesUpdated = new EventEmitter<void>();
    @Input() showToast: boolean = true;
    @Input() quickSetup = false;
    @Input() worklogCategoriesSettings = false;
    @Input() allowNext = false;
    @Input() inModal: boolean = false;
    @Input() onboardingWizard = false;
    @Input() classStyle: string = '';
    @Input() pickListWrapperStyle: string = '';
    @Input() showSplitContainer: boolean = true;

    private subscription = new Subscription();
    issueTypes: PicklistItem[] = [];
    categories: PicklistCategory[] = [];
    worklogCategoriesTranslations: WorklogCategoriesTranslation;
    categoryNamesNotAllowedList = [];

    worklogDistribution: { [key: string]: WorklogDistributionConfig; };
    sourceIssueTypeLoadingState: LoadingState = LoadingState.Pending;
    suggestedWorklogActions: WorklogConfigAction[] = [];
    unAssignedIssueTypes: IssueType[] = [];
    isConfigUpdated = false;

    lastNumberOfDaysForRecentIssueTypes: Number;
    productiveAlias = '';

    constructor(
        private store: Store<AppState>,
        private messageService: MessageService,
        private trackingService: TrackingService,
        private stepService: StepsService,
        private router: Router
    ) { }

    get rootNav() {
        if (this.onboardingWizard) {
            return RootNav.Onboarding.Categories;
        }
        else if (this.quickSetup) {
            return RootNav.AdminDashboard.QuickSetup.Categories;
        }
        else {
            return RootNav.AdminDashboard.WorklogSettings.Categories;
        }
    }

    get userAction() {
        if (this.onboardingWizard) {
            return UserActions.Onboarding.Category;
        }
        else if (this.quickSetup) {
            return AdminActions.QuickSetup.Category;
        }
        else {
            return AdminActions.WorklogCategoriesSettings.Category;
        }
    }

    ngOnInit(): void {
        this.trackingService.captureNavigationStep(this.rootNav);
        this.store.dispatch(fetchConfigs({ propKeys: [WORKLOG_DISTRIBUTION] }));

        const translations$ = this.store.pipe(selectWorklogCategoriesTranslations);
        const issueTypes$ = this.store.pipe(selectIssueTypes);
        const worklogDistribution$ = this.store.pipe(selectServerConfig);
        const configUpdated$ = this.store.pipe(selectConfigUpdated, filter(data => data[WORKLOG_DISTRIBUTION]));
        const worklogDistributionLoadingState$ = this.store.pipe(selectWorklogDistributionLoadingState);
        const unAssignedIssueTypes$ = this.store.pipe(selectUnassignedIssueTypes);
        const selectWorklogConfigSync$ = this.store.pipe(selectWorklogConfigSync);
        const sourceIssueTypesLoadingState$ = this.store.pipe(selectSourceIssueTypesLoadingState);
        const teamUpdateLoadingStateForOnboadingWizard = this.store.pipe(selectupdateOnboardingTeamLoadingState);
        const lastNumberOfDaysForRecentIssueTypes$ = this.store.pipe(selectLastNumberOfDaysForRecentIssueTypes);
        const workLogHoursPerDay$ = this.store.pipe(selectWorkLogGeneralSettings);

        this.subscription.add(
            workLogHoursPerDay$.subscribe(cfg => {
                if (cfg.productiveAlias && cfg.nonProductiveAlias) {
                    this.productiveAlias = cfg.productiveAlias;
                    this.categoryNamesNotAllowedList = [cfg.productiveAlias, cfg.nonProductiveAlias];
                }
            })
        )


        this.subscription.add(
            translations$.subscribe((translation: WorklogCategoriesTranslation) => {
                this.worklogCategoriesTranslations = translation;
            })
        );

        this.subscription.add(
            lastNumberOfDaysForRecentIssueTypes$.subscribe((days: Number) => {
                this.lastNumberOfDaysForRecentIssueTypes = days;
            })
        );



        if (this.onboardingWizard) {
            this.subscription.add(teamUpdateLoadingStateForOnboadingWizard.subscribe(loadingState => {
                if (loadingState === LoadingState.Done) {
                    this.store.dispatch(fetchSourceIssueTypes());
                }
            }))
        } else {
            this.store.dispatch(fetchSourceIssueTypes());
        }


        this.subscription.add(configUpdated$.subscribe(() => {
            this.acceptChanges();
        }));

        this.subscription.add(worklogDistributionLoadingState$.subscribe(loadingState => {
            if (loadingState == LoadingState.Done && this.quickSetup) {
                this.refreshWorkLog();
            }
            
            if (loadingState == LoadingState.Done && this.showSplitContainer) {
                this.router.navigate([`/space/${getCurrentWorkspace()}/instance/${getCurrentInstance()}/feature/team-view`]);
            }
        }));

        this.subscription.add(issueTypes$.subscribe(data => {
            if (data && data.sourceIssueTypes && data.sourceIssueTypes.length > 0) {
                this.issueTypes = [...data.sourceIssueTypes.map(item => ({ ...item }))];
            }
        }));

        this.subscription.add(worklogDistribution$.subscribe(data => {
            const categories = data[WORKLOG_DISTRIBUTION];

            if (categories && Object.keys(categories).length > 0) {
                this.prepareCategories(categories);
            }
        }));

        this.subscription.add(sourceIssueTypesLoadingState$.subscribe(loading => {
            this.sourceIssueTypeLoadingState = loading;

            if (loading === LoadingState.Error) {
                this.messageService.add({
                    key: 'message',
                    severity: 'error',
                    summary: 'Error!',
                    detail: 'Error occured while loading data. Please reload the page.'
                });
            }
        }));


        this.subscription.add(
            combineLatest([
                unAssignedIssueTypes$,
                worklogDistribution$,
                selectWorklogConfigSync$,
                sourceIssueTypesLoadingState$
            ]).subscribe(
                ([
                    unAssignedIssueTypes,
                    serverConfig,
                    suggestedWorklogActions,
                    sourceIssueTypeLoadingState
                ]) => {
                    this.sourceIssueTypeLoadingState = sourceIssueTypeLoadingState;
                    if (unAssignedIssueTypes && serverConfig[WORKLOG_DISTRIBUTION]) {
                        if (sourceIssueTypeLoadingState === LoadingState.Done && Object.keys(serverConfig[WORKLOG_DISTRIBUTION]).length && (suggestedWorklogActions.length || this.hasDuplicateIssueTypeNames(unAssignedIssueTypes, serverConfig[WORKLOG_DISTRIBUTION])) && !this.isConfigUpdated) {
                            this.issueTypes = serverConfig[ISSUE_SOURCE_TYPE_CONFIGS].sourceIssueTypes;
                            this.suggestedWorklogActions = suggestedWorklogActions;
                            this.unAssignedIssueTypes = unAssignedIssueTypes;
                            this.worklogDistribution = serverConfig[WORKLOG_DISTRIBUTION];
                            this.isConfigUpdated = true;
                            this.updateWorklogConfig()
                        }
                    }
                }
            )
        );

        if (this.showSplitContainer) {
            this.stepService.setCurrentStepIndex(1, Constants.KHOJI_STEPS_ONBOARDING_KEY);
        }
    }

    hasDuplicateIssueTypeNames(unAssignedIssueTypes, worklogDistribution) {
        const unAssignedIssueTypesMap = unAssignedIssueTypes.reduce((map, issueType) => {
            map[issueType.name] = issueType;
            return map;
        }, {});

        const categoryIssueTypeMap = Object.keys(worklogDistribution).reduce((map, key) => {
            worklogDistribution[key].issueTypes.forEach(issueType => {
                map[issueType.name] = key;
            });
            return map;
        }, {});

        for (let issueTypeName in categoryIssueTypeMap) {
            if (unAssignedIssueTypesMap.hasOwnProperty(issueTypeName)) {
                return true;
            }
        }
        return false;
    }

    prepareCategories(categories: Record<string, WorklogDistributionConfig>) {
        const cates: PicklistCategory[] = [];

        for (let cateName in categories) {
            const cat = categories[cateName];

            cates.push({
                id: '', // will be assigned unique id in picklist
                name: cateName,
                color: cat.color,
                description: cat.description,
                items: cat.issueTypes.map(item => ({ ...item })) || [],
            });
        }

        this.categories = cates;
    }

    async saveChanges() {
        this.categoryAliasesComponent?.saveChanges();

        if (!this.picklist?.hasChanges()) return;

        const categories = {};

        const cats = await this.picklist?.getCompletedCategories((c: PicklistCategory) => c);

        if (!cats) return;

        cats.forEach(c => {
            categories[c.name] = {
                description: c.description,
                color: c.color,
                issueTypes: [...c.items.map(item => ({
                    id: item.id,
                    name: item.name
                }))],
            };
        });


        const propValue = JSON.stringify(categories);

        if (this.onboardingWizard) {
            if (propValue !== '{}') {
                this.store.dispatch(updateConfig({ propKey: WORKLOG_DISTRIBUTION, propValue, showToast: false }));
            }
        }

        if (!this.quickSetup && !this.onboardingWizard) {
            this.store.dispatch(updateConfig({ propKey: WORKLOG_DISTRIBUTION, propValue, showToast: this.showSplitContainer ? false : this.showToast }));
        }

        if (this.quickSetup) {
            this.store.dispatch(updateConfig({ propKey: WORKLOG_DISTRIBUTION, propValue }));
            this.store.dispatch(worklogDistributionLoadingState({ loadingState: LoadingState.Loading }));
        }


        this.categoriesUpdated.emit();
        const Categories_Added_Count = Object.keys(categories).length;
        this.trackingService.captureUserAction(this.userAction.Save_Click, { Categories_Added_Count });
        this.isConfigUpdated = true;
    }

    skipIssueCategorizeStep() {
        this.trackingService.captureNavigationStep(this.rootNav.Do_Later_Click);
        this.categoriesUpdated.emit();
    }

    private refreshWorkLog = () => {
        this.store.dispatch(fetchTeamWorklogStats());

        const dateTo$ = this.store.pipe(selectDateTo).subscribe(dateTo => {
            const currentDate = new Date();
            const currentDay = currentDate.getDate();
            const currentfullYear = currentDate.getFullYear();
            const currentMonth = currentDate.getMonth() + 1;
            const selectedMonth = Number(dateTo.split('-')[1]);
            if (currentMonth === selectedMonth) {
                this.store.dispatch(fetchTeamWorklogStatsForThisMonth({
                    dateFrom: `${currentfullYear}-${currentMonth >= 10 ? currentMonth : '0' + currentMonth}-01`,
                    dateTo: `${currentfullYear}-${currentMonth >= 10 ? currentMonth : '0' + currentMonth}-${currentDay >= 10 ? currentDay : '0' + currentDay}`
                }));
            }
        });

        dateTo$.unsubscribe();
        this.store.dispatch(fetchMembers());
    }

    acceptChanges() {
        this.picklist?.acceptChanges();
    }

    hasChanges() {
        return this.picklist?.hasChanges() || this.categoryAliasesComponent?.hasChanges();
    }

    captureNewButtonClick() {
        this.trackingService.captureUserAction(this.userAction.New_Category_Click);
    }

    updateWorklogConfig() {
        const deletedIssuesIds = this.suggestedWorklogActions
            .filter((action) => action)
            .filter(({ action }) => action === WorklogConfigActionType.DELETE)
            .map(({ issueType: { id } }) => id);

        const editedIssues = this.suggestedWorklogActions
            .filter((action) => action)
            .filter(({ action }) => action === WorklogConfigActionType.EDIT)
            .map(({ issueType }) => ({
                id: issueType.id,
                oldName: issueType.name,
                newName: this.issueTypes.find(({ id }) => issueType.id === id)?.name
            }));

        const unAssignedIssueTypesMap = this.unAssignedIssueTypes.reduce((map, issueType) => {
            map[issueType.name] = issueType;
            return map;
        }, {});

        const categoryIssueTypeMap = Object.keys(this.worklogDistribution).reduce((map, key) => {
            this.worklogDistribution[key].issueTypes.forEach(issueType => {
                map[issueType.name] = key;
            });
            return map;
        }, {});

        const propValue = Object.keys(this.worklogDistribution).reduce<{
            [key: string]: WorklogDistributionConfig;
        }>((previousValue, key) => {
            const distribution = this.worklogDistribution[key];
            previousValue[key] = {
                ...distribution,
                issueTypes: distribution.issueTypes
                    .filter(({ id }) => !deletedIssuesIds.includes(id))
                    .map((issueType) => {
                        const editedIssue = editedIssues.find(({ id }) => issueType.id === id);
                        if (editedIssue) {
                            if (unAssignedIssueTypesMap[editedIssue.newName]) {
                                return null;
                            } else {
                                return { ...issueType, name: editedIssue.newName };
                            }
                        }
                        return issueType;
                    })
                    .filter(issueType => issueType !== null),
            };

            distribution.issueTypes.forEach((issueType) => {
                if (unAssignedIssueTypesMap[issueType.name]) {
                    const unAssignedIssueType = unAssignedIssueTypesMap[issueType.name];
                    previousValue[key].issueTypes.push(unAssignedIssueType);
                }
            });

            return previousValue;
        }, {});

        editedIssues.forEach(({ id, oldName, newName }) => {
            const newCategory = categoryIssueTypeMap[newName];
            if (newCategory && newCategory !== categoryIssueTypeMap[oldName]) {
                Object.keys(propValue).forEach(key => {
                    propValue[key].issueTypes = propValue[key].issueTypes.filter(issueType => issueType.id !== id);
                });
                propValue[newCategory].issueTypes.push(this.issueTypes.find(({ id: issueId }) => id === issueId));
            }
        });

        this.store.dispatch(updateConfig({ propKey: WORKLOG_DISTRIBUTION, propValue: JSON.stringify(propValue), showToast: false }));
    }

    resetChanges() {
        this.trackingService.captureUserAction(this.userAction.Reset_Click);
        this.picklist?.reset();
        this.categoryAliasesComponent?.reset();
    }

    ngOnDestroy(): void {
        if (!this.worklogCategoriesSettings) {
            this.store.dispatch(fetchInstanceDetails());
        }

        ColorPickerComponent?.destroy();
        this.store.dispatch(worklogDistributionLoadingState({ loadingState: LoadingState.Pending }));
        this.subscription.unsubscribe();
    }
}
