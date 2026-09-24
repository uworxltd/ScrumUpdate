import { Component, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { Constants } from 'app/constants';
import { AppState } from 'app/states/app-states';
import { workLogCategorizationEnabledSelector } from 'app/user-profile/state/user-profile.selectors';
import { Subscription } from 'rxjs';
import { StepsComponent } from '../steps/steps.component';

@Component({
  selector: 'khoji-split-container',
  templateUrl: './split-container.component.html',
  styleUrls: ['./split-container.component.scss'],
  standalone: true,
  imports: [
    StepsComponent,
  ]
})
export class SplitContainerComponent implements OnInit {
  private subscription = new Subscription();
  isWorklogCategoryEnabled = false;
  allSteps: string[] = ['Build your team', 'Create categories', 'View Work Log'];

  constants = Constants;
  constructor(private store: Store<AppState>) {}

  ngOnInit(): void {
    const workLogCategorizationEnabled$ = this.store.select(workLogCategorizationEnabledSelector);
    this.subscription.add(workLogCategorizationEnabled$.subscribe(workLogCategorizationEnabled => {
      this.isWorklogCategoryEnabled = workLogCategorizationEnabled;
    }));

  }

  get stepsForDisplay(): string[] {
    return this.isWorklogCategoryEnabled
      ? this.allSteps
      : this.allSteps.filter(step => step !== 'Create categories');
  }

}
