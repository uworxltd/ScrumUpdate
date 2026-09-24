import { Component, OnDestroy, OnInit } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { StepsModule } from "primeng/steps";
import { Subscription } from 'rxjs';
import { CardModule } from "primeng/card";
import { DividerModule } from "primeng/divider";
import { CommonModule } from '@angular/common';

@Component({
  selector: 'khoji-onboarding',
  standalone: true,
  templateUrl: './onboarding.component.html',
  styleUrl: './onboarding.component.scss',
  imports: [
    CommonModule,
    StepsModule,
    CardModule,
    DividerModule
],
})
export class OnboardingComponent implements OnInit, OnDestroy {
  subscription = new Subscription();
  items: MenuItem[];

  ngOnInit(): void {
    this.items = [{
      label: 'Choose Role',
      routerLink: 'choose-role'
    }, {
      label: 'Connect',
    }, {
      label: 'Customize',
      title: 'this is title',
      tooltip: 'this is tooltip'
    }
  ];
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
