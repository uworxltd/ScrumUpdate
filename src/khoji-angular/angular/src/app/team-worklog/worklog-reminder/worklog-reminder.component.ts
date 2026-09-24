/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { ChangeDetectorRef, Component, EventEmitter, HostListener, Input, OnDestroy, OnInit, Output, TemplateRef, ViewChild } from '@angular/core';
import { Store } from '@ngrx/store';
import { Role, User } from 'app/admin/admin.entities';
import { editUserInBulk, fetchUsersAgainstsMemberIds, fetchUsersAgainstsMemberIdsLoadingState, setSendEmailForWorklogReminderLoadingState } from 'app/admin/state/admin.actions';
import { selectFetchUsersAgainstsMemberIdsLoadingState, selectTeamsList, selectUserAgaintstMemberIds } from 'app/admin/state/admin.selector';
import { Constants } from 'app/constants';
import { WorklogReminder } from 'app/datamodels/team-work-log-datamodel';
import { TeamWorklog } from 'app/interface/team-worklog-stats';
import { AdminActions, ComponentNavigation, TrackingService } from 'app/services/tracking';
import { MemberRemindWorklog } from 'app/shared/picklist/interfaces';
import { AppState, LoadingState } from 'app/states/app-states';
import { fetchMembers, sendWorklogReminderEmail } from 'app/states/app.actions';
import { selectUnqiueTeamMembers } from 'app/states/global-filters.selector';
import { selectEditUserInBulkLoadingState, selectSendEmailForWorklogReminder } from 'app/states/global-process.selector';
import { selectTeamWorklogStats } from 'app/states/global-statistics.selector';
import { selectTranslation } from 'app/states/global-translations.selector';
import { selectKhojiUserProfile } from 'app/user-profile/state/user-profile.selectors';
import { combineLatest, Subscription } from 'rxjs';
interface TreeNode {
  data?: any;
  children?: TreeNode[];
  leaf?: boolean;
  expanded?: boolean;
  selected?: boolean;
}

@Component({
  selector: 'khoji-worklog-reminder',
  templateUrl: './worklog-reminder.component.html',
  styleUrls: ['./worklog-reminder.component.scss']
})
export class WorklogReminderComponent implements OnInit, OnDestroy {
  @ViewChild('addEmailDialog') addEmailDialog!: TemplateRef<any>;
  @Output() modalClosed = new EventEmitter<void>();

  private _showRemindTeamModal = false;
  @Input() get showRemindTeamModal() {
    return this._showRemindTeamModal;
  }
  set showRemindTeamModal(showModal: boolean) {
    this._showRemindTeamModal = showModal;
  }

  private _teamNameForReminder: string = "";
  @Input() get teamNameForReminder() {
    return this._teamNameForReminder;
  }
  set teamNameForReminder(teamName: string | undefined) {
    this._teamNameForReminder = teamName || '';
  }

  @Input() supervisorId: number = null;

  customText: string = '';
  subscription = new Subscription();
  sourceUser: any
  translation: any;
  filteredMembers: MemberRemindWorklog[] = [];
  isEmailEnabled = false;
  fetchUserData = LoadingState.Loading;
  loadingStates = LoadingState;

  missingEmailsMemberCount: number = 0;
  missingWorklogRagColor: string = "#B92A1C";
  incompleteWorklogRagColor: string = "#E7BA1A";
  selectedMembers: MemberRemindWorklog[] = [];
  selectedUsers: User[] = [];

  parentChildStructure: TreeNode[] = [];
  selectedMembersNodes: TreeNode[] = [];

  emailMessage = "";
  isEmailValid: boolean = true;
  constants = Constants;
  userMemberEmail: string = "";
  showAddEmailDialog: boolean = false;
  membersWithMissingEmails: MemberRemindWorklog[] = [];
  incompleteWorklogMembers: MemberRemindWorklog[] = [];
  edittedUserDetails: { accountId: string; email: string; roleCode: string; }[] = [];
  isEmailUpdated: boolean = false;
  isUpdateDisabled: boolean = true;
  nonNullEmails: string[] = [];
  emailOccurrences: Map<string, number> = new Map();
  isDuplicatedEmail: boolean = false;
  private emailRegex: RegExp = new RegExp(this.constants.KHOJI_EMAIL_REGX);

  dynamicScrollHeight: string = '40vh';
  dynamicModalHeight: string = '60vh';

  constructor(public store: Store<AppState>, private cdr: ChangeDetectorRef, private trackingService: TrackingService) {
    this.adjustTreeTableHeight();
    this.updateDialogHeight();
  }

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.adjustTreeTableHeight();
    this.updateDialogHeight();
  }

  adjustTreeTableHeight() {
    const windowHeight = window.innerHeight;
    if (windowHeight <= 700) {
      this.dynamicScrollHeight = '45vh';
    } else if (windowHeight <= 800) {
      this.dynamicScrollHeight = `42vh`;
    } else if (windowHeight <= 900) {
      this.dynamicScrollHeight = `43vh`;
    } else if (windowHeight <= 1050) {
      this.dynamicScrollHeight = `36vh`;
    } else {
      this.dynamicScrollHeight = `48vh`;
    }
  }

  updateDialogHeight() {
    const windowHeight = window.innerHeight;
    if (windowHeight <= 700) {
      this.dynamicModalHeight = '70vh';
    }
    else if (windowHeight <= 800) {
      this.dynamicModalHeight = '60vh';
    } else if (windowHeight <= 1050) {
      this.dynamicModalHeight = '50vh';
    } else {
      this.dynamicModalHeight = '45vh';
    }
  }

  ngOnInit() {
    this.trackingService.captureNavigationStep(ComponentNavigation.TeamWorkLogAnalysis.RemindTeam);
    const worklogStats$ = this.store.pipe(selectTeamWorklogStats);
    const translation$ = this.store.pipe(selectTranslation);
    const usersAgainstMembers$ = this.store.pipe(selectUserAgaintstMemberIds);
    const globalFilterMembers$ = this.store.pipe(selectUnqiueTeamMembers);
    const usersLoadingState$ = this.store.pipe(selectFetchUsersAgainstsMemberIdsLoadingState)
    const editEmailLoadingState$ = this.store.pipe(selectEditUserInBulkLoadingState);
    const sendEmailReminderLoadingState$ = this.store.pipe(selectSendEmailForWorklogReminder);
    const teams$ = this.store.pipe(selectTeamsList);
    const userProfile$ = this.store.select('userProfile');
    const userKhojiProfile$ = this.store.pipe(selectKhojiUserProfile);

    this.subscription.add(editEmailLoadingState$.subscribe(loadingState => {
      if (loadingState === LoadingState.Done) {
        this.updateParentChildStructureMissingEmail();
      }
    }
    ))

    this.subscription.add(sendEmailReminderLoadingState$.subscribe(loadingState => {
      if (loadingState === LoadingState.Done) {
        this.showRemindTeamModal = false;
        this.store.dispatch(setSendEmailForWorklogReminderLoadingState({ loadingState: LoadingState.Loading }));
      }
    }
    ))

    this.subscription.add(
      combineLatest([usersAgainstMembers$, usersLoadingState$, teams$, userKhojiProfile$]).subscribe(([users, loadingState, teams, profile]) => {
        this.fetchUserData = loadingState;
        
        if (loadingState === LoadingState.Done) {
          const teamUserIds = teams
            .filter((team) => team.supervisors.some((supervisor) => supervisor.memberEmail === profile.email))
            .map((team) => team.members.map((member) => member.id))
            .flat();
          const teamAccountIds = teams
            .filter((team) => team.supervisors.some((supervisor) => supervisor.memberEmail === profile.email))
            .map((team) => team.members.map((member) => member.accountId))
            .flat();
          const teamUsers = users.filter((user) => teamUserIds.includes(+user.id));
          this.initialiseRemindTeamDataForGiven(teamUsers, teamAccountIds);
          this.updateEmailButtonState();
        }
      })
    );

    this.subscription.add(combineLatest([worklogStats$, globalFilterMembers$]).subscribe(([stats, members]) => {
      this.nonNullEmails = members.map(member => member.memberEmail).filter(email => email !== null);
      if (this.teamNameForReminder) {
        stats = {
          ...stats,
          teamWorklogs: stats.teamWorklogs.filter(
            team => team.teamName === this.teamNameForReminder
          )
        };
      }
      this.incompleteWorklogMembers = this.getMembersWithMissingAndIncompleteWorklog(stats.teamWorklogs);
      const memberIds: number[] = this.incompleteWorklogMembers.map(mem =>
        members.find(m => m.accountId === mem.accountId).id
      );
      this.store.dispatch(fetchUsersAgainstsMemberIds({ memberIds }));
    }
    ));

    this.subscription.add(translation$.subscribe(data => {
      this.translation = data
    }))

    this.customText = "";

    this.subscription.add(userProfile$.subscribe(userProfile => {
      this.userMemberEmail = userProfile.khojiUserProfile.email;
    }));

  }

  updateParentChildStructureMissingEmail() {
    const listOfUserAccountIds = this.edittedUserDetails.map(user => user.accountId);
    this.membersWithMissingEmails = this.membersWithMissingEmails.filter(member => !listOfUserAccountIds.includes(member.accountId));
    this.missingEmailsMemberCount = this.membersWithMissingEmails.length;
    if (this.missingEmailsMemberCount) {
      this.emailMessage = `Email of ${this.missingEmailsMemberCount} ${this.missingEmailsMemberCount === 1 ? "member" : "members"} is missing`;
      ;
    }
    this.parentChildStructure.forEach(pc => {
      pc.children?.forEach(child => {
        const email = this.edittedUserDetails.find(u => u.accountId === child.data.obj.accountId)?.email;
        if (email) {

          child.data.obj.email = email
        }
      })
    });
    this.parentChildStructure = [...this.parentChildStructure];
    this.updateEmailButtonState();
  }

  initialiseRemindTeamDataForGiven(users: User[], finalUserAccountIds?: string[]) {
    const accountIdToAvatarMap = users.reduce<{
      [key: string]: { avatarURL: string; id: string; role: Role, email: string };
    }>((map, user) => {
      const { member } = user;

      if (member && member.accountId) {
        const role: Role = member.role;

        const avatarURL = user.avatarURL || '';

        map[member.accountId] = {
          avatarURL,
          id: member.id.toString(),
          role,
          email: member.memberEmail
        };
      }

      return map;
    }, {});


    this.filteredMembers = this.incompleteWorklogMembers
      .filter((m) => finalUserAccountIds.includes(m.accountId))
      .map((member) => {
        const avatarData: any = accountIdToAvatarMap[member.accountId] || {};

        return {
          ...member,
          id: avatarData.id || null,
          avatarURL: avatarData.avatarURL || null,
          selected: false,
          userRole: avatarData.role || null,
          email: avatarData.email
        };
      });

    this.membersWithMissingEmails = this.filteredMembers.filter(member => !member.email);
    this.missingEmailsMemberCount = this.membersWithMissingEmails.length;

    let memberWithMissingWorklog: TreeNode[] = this.filteredMembers.filter(member => member.percentage === 0).map
      (
        member => ({
          data: {
            name: member.memberName,
            obj: { ...member },
          },
          selected: true
        }));


    let memberWithIncompleteWorklog: TreeNode[] = this.filteredMembers.filter(member => member.percentage > 0 && member.percentage < 100).map
      (
        member => ({
          data: {
            name: member.memberName,
            obj: { ...member },
          },
          selected: true
        })

      );

    if (memberWithMissingWorklog && memberWithMissingWorklog.length > 0) {
      this.parentChildStructure.push({
        children: memberWithMissingWorklog,
        data: {
          name: this.translation.timelog.emailReminder.missingWorklogCategoryLabel,
          obj: null
        },
        expanded: true,
        selected: true
      });
    }

    if (memberWithIncompleteWorklog && memberWithIncompleteWorklog.length > 0) {
      this.parentChildStructure.push({
        children: memberWithIncompleteWorklog,
        data: {
          name: this.translation.timelog.emailReminder.incompleteWorklogCategoryLabel,
          obj: null
        },
        expanded: true,
        selected: true
      });
    }
    this.parentChildStructure = [...this.parentChildStructure].splice(-2);
    this.missingEmailsMemberCount = this.filteredMembers.filter(member => !member.email).length;
    if (this.missingEmailsMemberCount) {
      this.emailMessage = `Email of ${this.missingEmailsMemberCount} ${this.missingEmailsMemberCount === 1 ? "member" : "members"} is missing`;
    }
    this.selectAllNodes(this.parentChildStructure);
  }

  updateEmailButtonState() {
    this.selectedMembers = [];
    this.selectedMembers = this.selectedMembersNodes.filter(node => !node.children || node.children?.length == 0).map(node => node.data.obj);
    this.isEmailEnabled = this.selectedMembers.some(member => member.email && member.email != null && member.email.trim() !== "");
  }

  selectAllNodes(nodes: TreeNode[]) {
    nodes.forEach(node => {
      this.selectedMembersNodes.push(node);  // Add node to selectedMembers
      if (node.children) {
        this.selectAllNodes(node.children);  // Recursively select child nodes
      }
    });
  }

  onNodeSelectionChange(node: TreeNode) {
    this.updateChildrenSelection(node);
    this.updateParentSelection(node);
    this.updateEmailButtonState();
  }

  updateChildrenSelection(node: TreeNode) {
    if (node.children) {
      node.children.forEach(child => {
        child.selected = node.selected; // Set child selection to match parent
        this.updateChildrenSelection(child); // Recursive update
      });
    }
    this.updateSelectedNodes(); // Update the global selection list
  }

  updateParentSelection(node: TreeNode) {
    let parentNode = this.findParentNode(this.parentChildStructure, node);
    while (parentNode) {
      const allChildrenSelected = parentNode.children ? parentNode.children.every(child => child.selected) : false;
      parentNode.selected = allChildrenSelected;
      this.updateSelectedNodes(); // Update the global selection list

      parentNode = this.findParentNode(this.parentChildStructure, parentNode);
    }
  }

  updateSelectedNodes() {
    this.selectedMembersNodes = this.findAllSelectedNodes(this.parentChildStructure);
  }

  findAllSelectedNodes(nodes: TreeNode[]): TreeNode[] {
    let selectedNodes: TreeNode[] = [];
    for (const node of nodes) {
      if (node.selected) {
        selectedNodes.push(node);
      }
      if (node.children) {
        selectedNodes = selectedNodes.concat(this.findAllSelectedNodes(node.children));
      }
    }
    return selectedNodes;
  }

  findParentNode(nodes: TreeNode[], childNode: TreeNode): TreeNode | null {
    for (const node of nodes) {
      if (node.children && node.children.includes(childNode)) {
        return node;
      }
      const found = this.findParentNode(node.children || [], childNode);
      if (found) {
        return found;
      }
    }
    return null;
  }

  getMembersWithMissingAndIncompleteWorklog(teamWorklog: TeamWorklog[]): MemberRemindWorklog[] {
    const uniqueMembers = new Map<string, MemberRemindWorklog>();

    teamWorklog.forEach(teamWorklog => {
      teamWorklog.memberWorklogs.forEach(member => {
        const existing = uniqueMembers.get(member.memberName);

        uniqueMembers.set(member.memberName, {
          memberName: member.memberName,
          accountId: member.accountId,
          percentage: existing ? Math.max(existing.percentage, member.percentage) : member.percentage,
          email: member.email,
        });
      });
    });

    const allMembers = Array.from(uniqueMembers.values());

    const filterMembers = allMembers.filter(member =>
      member.percentage === 0 || (member.percentage > 0 && member.percentage < 100)
    );

    return filterMembers;
  }

  onSendEmail() {
    const url = new URL(location.href);
    const dateFrom = url.searchParams.get('dateFrom');
    const dateTo = url.searchParams.get('dateTo');

    // Replacing the teamName parameter with the required team name if the reminder is for single team
    if (this.teamNameForReminder && this.teamNameForReminder.trim() !== '') {
      url.searchParams.set('teamName', this.teamNameForReminder);
    }

    const memberIdsList = this.selectedMembers.map(member => member.id.toString());

    const worklogReminder: WorklogReminder = {
      supervisorId: this.supervisorId.toString(),
      memberIds: memberIdsList,
      workLogUrl: url.href,
      dateFrom: dateFrom,
      dateTo: dateTo,
      customText: this.customText
    };

    this.store.dispatch(sendWorklogReminderEmail({ worklogReminder: worklogReminder }));
    this.trackingService.captureUserAction(AdminActions.RemindTeam.SendEmail);
  }

  openDialog() {
    this.showAddEmailDialog = true;
  }

  onUpdateEmail() {
    this.isEmailUpdated = true;
    this.edittedUserDetails = this.getUpdatedEmails();
    const emails = this.edittedUserDetails.map(user => user.email.toLowerCase());
    this.nonNullEmails.push(...emails.filter(email => email !== null && email !== undefined));

    if (this.edittedUserDetails.length > 0) {
      this.store.dispatch(editUserInBulk({ users: this.edittedUserDetails, isBulkEdit: true }));
    }
    this.onCancelAddEmail();
  }

  getUpdatedEmails() {
    return this.membersWithMissingEmails
      .filter(member => member.email)
      .map(member => ({
        accountId: member.accountId,
        email: member.email,
        roleCode: member.userRole.code
      }));
  }

  checkIfEmailsChanged() {
    this.isEmailValid = true;
    this.isDuplicatedEmail = false;
    this.isUpdateDisabled = true;
    this.emailOccurrences.clear();
    this.membersWithMissingEmails.forEach(member => {
      if (member.email) {
        if (!this.emailRegex.test(member.email)) {
          this.isEmailValid = false;
        }
        const currentCount = this.emailOccurrences.get(member.email.toLowerCase()) || 0;
        this.emailOccurrences.set(member.email.toLowerCase(), currentCount + 1);
        if (this.nonNullEmails.includes(member.email.toLowerCase())) {
          this.isDuplicatedEmail = true;
        }
      } else {
        this.isUpdateDisabled = false;
      }
    });
    const hasDuplicates = Array.from(this.emailOccurrences.values()).some(count => count > 1);
    if (hasDuplicates) {
      this.isDuplicatedEmail = true;
    }
    this.isUpdateDisabled = this.membersWithMissingEmails.every(member => !member.email);
  }

  isDuplicateEmail(email: string): boolean {
    if (email) {
      const emailLoweCase = email.toLowerCase();
      return this.emailOccurrences.get(emailLoweCase)! > 1 || this.nonNullEmails.includes(emailLoweCase);
    }
    return false;

  }

  isInvalidEmail(email: string): boolean {
    return email ? !this.emailRegex.test(email) : false;
  }

  onCancelRemindTeamModal() {
    this.showRemindTeamModal = false;
    this.modalClosed.emit();
    this.trackingService.captureUserAction(AdminActions.RemindTeam.ClosedButton);
  }

  onCancelAddEmail() {
    this.membersWithMissingEmails = this.membersWithMissingEmails.map(member => ({ ...member, email: '' }));
    this.showAddEmailDialog = false;
    this.isUpdateDisabled = true;
    this.cdr.detectChanges();
    this.trackingService.captureUserAction(AdminActions.RemindTeam.ClosedButton);
  }

  ngOnDestroy() {
    if (this.isEmailUpdated) {
      this.store.dispatch(fetchMembers());
    }
    this.store.dispatch(fetchUsersAgainstsMemberIdsLoadingState({ loadingState: LoadingState.Pending }));
    this.subscription.unsubscribe();
  }

}
