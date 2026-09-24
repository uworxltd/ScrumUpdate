import { CommonModule } from '@angular/common';
import { Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';
import { CacheService } from 'app/caching/cache.service';
import { Constants } from 'app/constants';
import { AppState, LoadingState } from 'app/states/app-states';
import { combineLatest, fromEvent, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { getTimeZoneDate, getWeek, isSameWeek } from "app/shared/week-input/week-input.component";
import { selectTranslation } from 'app/states/global-translations.selector';
import { selectInstanceUser } from '../state/log-my-work.selector';
import { selectInstanceUserMetaDataLoadingState } from 'app/states/global-process.selector';
import { DailyScrumUpdatesComponent } from "../daily-scrum/daily-scrum-updates.component";
import { fetchInstanceUserMetaData, setDailyScrumDates, setDailyScrumUpdates, setInstanceUserMetaDataLoadingState } from '../state/log-my-work.action';
import { addDays } from 'date-fns';
import { getParentActivatedRoute } from 'app/shared/helper-functions';
import { SpaceComponent } from 'app/space/space.component';
import { InstanceComponent } from 'app/instance/instance.component';
import { fetchInstanceDetails } from 'app/states/app.actions';

@Component({
  selector: 'khoji-scrum-update',
  standalone: true,
  templateUrl: './scrum-update.component.html',
  styleUrls: ['./scrum-update.component.scss'],
  imports: [
    CommonModule,
    DailyScrumUpdatesComponent
  ],
})
export class ScrumUpdateComponent implements OnInit, OnDestroy {
  translation: any;
  subscription = new Subscription();
  constants = Constants;
  loadingStates = LoadingState;
  selectedWeek = getWeek();
  maxDate = new Date();
  today = new Date();
  maxWeek = getWeek();
  timeZone: string;
  //isNextWeekAvailable = false;
  requestPanelShadow = false;
  //isIntegrationDone = false;
  //instanceUserAccountId: string;

  scrollTop$ = fromEvent(document.querySelector('.main-content-area'), 'scroll').pipe(map(event => event['target']['scrollTop']));

  instanceUserMetaDataLoadingState: LoadingState;

  constructor(
    private store: Store<AppState>,
    private titleService: Title,
    private ngZone: NgZone,
    private route: ActivatedRoute,
    public cacheService: CacheService,
  ) { }

  ngOnInit() {
    this.initDailyScrumUpdates();
    const instanceUser$ = this.store.pipe(selectInstanceUser);
    const instanceUserLoadingState$ = this.store.pipe(selectInstanceUserMetaDataLoadingState);
    const spaceRoute$ = getParentActivatedRoute(SpaceComponent, this.route)?.paramMap;
    const instanceRoute$ = getParentActivatedRoute(InstanceComponent, this.route)?.paramMap;

    this.subscription.add(this.scrollTop$.subscribe((scrollTop) => this.ngZone.run(() => this.requestPanelShadow = scrollTop > 0)));

    if (spaceRoute$ && instanceRoute$) {
      this.subscription.add(combineLatest([spaceRoute$, instanceRoute$]).subscribe(([spaceRoute, instanceRoute]) => {
        this.selectedWeek = getWeek();
      }))
    }

    this.subscription.add(
      this.store.pipe(selectTranslation).subscribe((translation) => {
        this.translation = translation;
        this.titleService.setTitle(this.translation?.pageTitles?.pulse);
      })
    );

    this.subscription.add(
      combineLatest([instanceUserLoadingState$, instanceUser$]).subscribe(([loadingState, instanceUser]) => {
        this.instanceUserMetaDataLoadingState = loadingState;

        if (loadingState === LoadingState.Done) {
          if (instanceUser) {
            this.timeZone = instanceUser.timeZone;
            this.maxDate = getTimeZoneDate(new Date(), this.timeZone)
          }
        }
      })
    );
  }

  initDailyScrumUpdates() {
    const todayDate = new Date().getISODateOnly();
    // if monday then yesterday is friday
    const yesterdayDate = todayDate.getDay() === 1 ? addDays(todayDate, -3) : addDays(todayDate, -1);
    this.store.dispatch(setDailyScrumUpdates({ response: null }));
    this.store.dispatch(setDailyScrumDates({ dates: { todayDate, yesterdayDate } }));
  }

  handleWeekChange(week: [Date, Date]) {
    if (isSameWeek(this.selectedWeek, week)) return;
    this.selectedWeek = week;
  }

  handleNextWeek(isNextWeekAvailable: boolean) {
    //this.isNextWeekAvailable = isNextWeekAvailable;
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}
