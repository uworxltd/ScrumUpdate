import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { Subscription, combineLatest } from 'rxjs';
import { AppState, LoadingState } from 'app/states/app-states';
import { selectAccessibleResources, selectAccessibleResourcesLoadingState, selectWorkspaces } from 'app/user-profile/state/user-profile.selectors';
import { fetchAccessibleResources } from 'app/states/app.actions';
import { JiraInstancesComponent } from './jira-instances.component';

@Component({
  selector: 'khoji-jira-instances-wrapper',
  standalone: true,
  imports: [CommonModule, ProgressSpinnerModule, JiraInstancesComponent],
  template: `
    <div class="flex justify-content-center align-items-center" style="min-height: 400px" *ngIf="!shouldShowUI">
      <p-progressSpinner [style]="{ width: '50px', height: '50px' }"></p-progressSpinner>
    </div>
    
    <khoji-jira-instances *ngIf="shouldShowUI"></khoji-jira-instances>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JiraInstancesWrapperComponent implements OnInit, OnDestroy {
  shouldShowUI: boolean = false;
  private subscription = new Subscription();

  constructor(
    private store: Store<AppState>,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.store.dispatch(fetchAccessibleResources());

    const accessibleResources$ = this.store.pipe(selectAccessibleResources);
    const accessibleResourcesLoadingState$ = this.store.pipe(selectAccessibleResourcesLoadingState);
    const workspaces$ = this.store.pipe(selectWorkspaces);

    this.subscription.add(
      combineLatest([
        accessibleResources$,
        workspaces$,
        accessibleResourcesLoadingState$
      ]).subscribe(([accessibleResources, workspaces, loadingState]) => {
        if (loadingState === LoadingState.Done && workspaces.length) {
          this.shouldShowUI = true;
          this.cdr.detectChanges();
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
