import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { AppState, LoadingState } from 'app/states/app-states';
import { setInstanceInviteActionLoadingState } from 'app/states/app.actions';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'khoji-invite-error-template',
  templateUrl: './invite-error-template.component.html',
  styleUrls: ['./invite-error-template.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule
  ]
})
export class InviteErrorTemplateComponent {

  constructor(private route: ActivatedRoute, private router: Router, private store: Store<AppState>) { }

  goBackToJiraInstancePage() {
    this.store.dispatch(setInstanceInviteActionLoadingState({ loadingState: LoadingState.Pending }));
    this.router.navigate(['../', 'jira-instances'], { relativeTo: this.route });
  }
}
