import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, HostListener, Input, ViewChild } from '@angular/core';
import { Store } from '@ngrx/store';
import { DomSelector } from 'app/shared/dom-selector.directive';
import { AppState, WorklogTeamSelectable } from 'app/states/app-states';
import { clearWorklogTeamsFilter, setWorklogTeamsFilter } from 'app/states/app.actions';
import { selectWorklogTeamsFilter } from 'app/states/global-filters.selector';
import { selectTranslation } from 'app/states/global-translations.selector';
import { ButtonModule } from 'primeng/button';
import { ChipModule } from 'primeng/chip';
import { Observable, Subscription } from 'rxjs';

@Component({
  selector: 'khoji-team-worklog-selection',
  standalone: true,
  imports: [
    CommonModule,
    ChipModule,
    ButtonModule,
    DomSelector,],
  templateUrl: './team-worklog-selection.component.html',
  styleUrls: ['./team-worklog-selection.component.scss']
})
export class TeamWorklogSelectionComponent implements AfterViewInit {
  worklogTeamsFilter$: Observable<WorklogTeamSelectable[]>;
  subscription = new Subscription();
  translation: any;

  @Input() domWidth = 0;

  @ViewChild('chipsScrollContainer') chipsScrollContainer!: ElementRef;

  showBackwardButton = false;
  showForwardButton = false;

  constructor(private store: Store<AppState>) { }

  ngOnInit(): void {
    this.worklogTeamsFilter$ = this.store.pipe(selectWorklogTeamsFilter);

    this.subscription.add(
      this.store.pipe(selectTranslation).subscribe((translation) => {
        this.translation = translation;
      })
    );
    this.updateButtonVisibility();
  }

  ngAfterViewInit() {
    this.updateButtonVisibility();
  }

  @HostListener('window:resize')
  onResize() {
    this.updateButtonVisibility();
  }

  scrollLeft() {
    const container = this.chipsScrollContainer?.nativeElement;
    if (!container) return;
    container.scrollTo({
      left: container.scrollLeft - 100,
      behavior: 'smooth'
    });
    this.updateButtonVisibility();
  }

  scrollRight() {
    const container = this.chipsScrollContainer?.nativeElement;
    if (!container) return;
    container.scrollTo({
      left: container.scrollLeft + 100,
      behavior: 'smooth'
    });
    this.updateButtonVisibility();
  }

  updateButtonVisibility() {
    setTimeout(() => {
      const container = this.chipsScrollContainer?.nativeElement;
      if (!container) return;
      const scrollWidth = container.scrollWidth;
      const clientWidth = container.clientWidth;
 
      this.showBackwardButton = container.scrollLeft > 0;
      this.showForwardButton = Math.floor(container.scrollLeft) < Math.floor(scrollWidth - clientWidth) - 2;
    })
  }

  toggleWorklogTeamSelection(team: string) {
    this.store.dispatch(setWorklogTeamsFilter({ team }));
  }

  clearAllWorklogTeamSelections() {
    this.store.dispatch(clearWorklogTeamsFilter());
  }
}
