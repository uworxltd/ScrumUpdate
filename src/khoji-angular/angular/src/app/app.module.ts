/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { DatePipe, LocationStrategy, PathLocationStrategy } from '@angular/common';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { APP_INITIALIZER, CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserModule, REMOVE_STYLES_ON_COMPONENT_DESTROY, Title } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule, UrlSerializer } from '@angular/router';
import { EffectsModule } from '@ngrx/effects';
import { StoreModule } from '@ngrx/store';
import { StoreDevtoolsModule } from '@ngrx/store-devtools';
import { NgxEchartsModule } from 'ngx-echarts';
import { MessageService } from 'primeng/api';
import { MenuModule } from 'primeng/menu';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { AdminEffects } from './admin/state/admin.effects';
import { adminReducer } from './admin/state/admin.reducer';
import { AppComponent } from './app.component';
import { routes } from './app.routes';
import { CachingInterceptor } from './caching/cache.interceptor';
import { CacheService } from './caching/cache.service';
import { HttpErrorInterceptor } from './interceptors/http.interceptor';
import { AppLayoutModule } from './layout/app.layout.module';
import { LogMyWorkEffect } from './log-my-work/state/log-my-work.effect';
import { logMyWorkReducer } from './log-my-work/state/log-my-work.reducer';
import { PagenotfoundComponent } from './pagenotfound/pagenotfound.component';
import { CookiesService } from './services/common/cookies.service';
import { HttpService } from './services/common/http.service';
import { FlagBasedPreloadingStrategy } from './services/preloading.module.service';
import { KhojiSpinnerService } from './services/spinner.service';
import { SessionExpiredComponent } from './session-expired/session-expired.component';
import { CustomUrlSerializer } from './shared/custom-url-serializer.component';
import { SharedModule } from './shared/shared.module';
import { AppState } from './states/app-states';
import { calculatedStatesReducer } from './states/calculated-state.reducer';
import { GlobalConfigsEffects } from './states/global-configs.effects';
import { globalConfigsReducer, menuReducer } from './states/global-configs.reducer';
import { FiltersEffects } from './states/global-filters.effects';
import { globalFiltersReducer } from './states/global-filters.reducer';
import { loadingStatesReducer } from './states/global-process.reducer';
import { globalTeamWorklogReducer, globalTeamWorklogReducerForThisMonth } from './states/global-team-worklog.reducer';
import { TranslationEffects } from './states/global-translations.effects';
import { globalTranslationsReducer } from './states/global-translations.reducer';
import { requestFiltersReducer } from './states/request-filters.reducer';
import { TeamWorklogEffects } from './states/team-worklog.effect';
import { TrackingEffect } from './states/tracking.effect';
import { chargeBeeService } from './user-profile/manage-subscription/chargebee.service';
import { UserProfileEffect } from './user-profile/state/user-profile.effects';
import { paymentHostedPageReducer, userProfileReducer } from './user-profile/state/user-profile.reducer';
import { NgcCookieConsentModule } from 'ngx-cookieconsent';
import { cookieConfig } from 'cookie-config';
import { commandsReducer } from './states/commands.reducer';
import { SprintAnalyticsReducer } from './states/sprint-analytics.reducer';
import { SprintAnalyticsEffects } from './states/sprint-analytics.effects';
import { ChatBotEffects, chatBotStateReducer } from './chat/chat/state';

@NgModule({
  declarations: [AppComponent, SessionExpiredComponent, PagenotfoundComponent],
  imports: [
    BrowserModule,
    MenuModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    BrowserAnimationsModule,
    RouterModule.forRoot(routes, { preloadingStrategy: FlagBasedPreloadingStrategy }),
    RouterModule,
    AppLayoutModule,
    ToastModule,
    TooltipModule,
    NgxEchartsModule.forRoot({ echarts: () => import('echarts') }),
    StoreModule.forRoot<AppState>({
      requestFilters: requestFiltersReducer,
      globalFilters: globalFiltersReducer,
      globalTranslations: globalTranslationsReducer,
      globalConfigs: globalConfigsReducer,
      loadingStates: loadingStatesReducer,
      calculatedState: calculatedStatesReducer,
      teamWorklogStatistics: globalTeamWorklogReducer,
      teamWorklogStatisticsForThisMonth: globalTeamWorklogReducerForThisMonth,
      userProfile: userProfileReducer,
      menu: menuReducer,
      paymentHostedObject: paymentHostedPageReducer,
      admin: adminReducer,
      logMyWork: logMyWorkReducer,
      commands: commandsReducer,
      sprintAnalyticsState: SprintAnalyticsReducer,
      chatBotState: chatBotStateReducer,
    }),
    StoreDevtoolsModule.instrument({
      maxAge: 25, // Retains last 25 states
      logOnly: false // Restrict extension to log-only mode
    }),
    EffectsModule.forRoot([TrackingEffect, TeamWorklogEffects, FiltersEffects, GlobalConfigsEffects, TranslationEffects, UserProfileEffect, AdminEffects, LogMyWorkEffect, SprintAnalyticsEffects, ChatBotEffects]),
    NgcCookieConsentModule.forRoot(cookieConfig),
    SharedModule
  ],
  providers: [
    CookiesService,
    HttpService,
    MessageService,
    KhojiSpinnerService,
    Title,
    chargeBeeService,
    DatePipe,
    { provide: HTTP_INTERCEPTORS, useClass: HttpErrorInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: CachingInterceptor, multi: true },
    [ Location, { provide: LocationStrategy, useClass: PathLocationStrategy }],
    { provide: UrlSerializer, useClass: CustomUrlSerializer },
    { provide: APP_INITIALIZER, useFactory: (cacheService: CacheService) => () => cacheService.loadConfig(), deps: [CacheService], multi: true },
    { provide: REMOVE_STYLES_ON_COMPONENT_DESTROY, useValue: false } // Enable style removal on destroy
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  bootstrap: [AppComponent]
})
export class AppModule {}
