/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { InputTextModule } from 'primeng/inputtext';
import { SidebarModule } from 'primeng/sidebar';
import { BadgeModule } from 'primeng/badge';
import { RadioButtonModule } from 'primeng/radiobutton';
import { InputSwitchModule } from 'primeng/inputswitch';
import { TooltipModule } from 'primeng/tooltip';
import { RippleModule } from 'primeng/ripple';
import { AppConfigModule } from './config/app.config.module';
import { AppLayoutComponent } from './app.layout.component';
import { AppBreadcrumbComponent } from './app.breadcrumb.component';
import { AppSidebarComponent } from './app.sidebar.component';
import { AppTopbarComponent } from './app.topbar.component';
import { AppProfileSidebarComponent } from './app.profilesidebar.component';
import { AppMenuComponent } from './app.menu.component';
import { AppMenuitemComponent } from './app.menuitem.component';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { AppLeftbarComponent } from './app.leftbar.component';
import { DividerModule } from 'primeng/divider';
import { MenuModule } from 'primeng/menu';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown'
import { RssFeedComponent } from 'app/shared/rss-feed/rss-feed.component';
import { ScrollPanelModule } from 'primeng/scrollpanel';
import { TreeModule } from 'primeng/tree';
import { FeatureUnlockComponent } from 'app/shared/feature-unlock/feature-unlock.component';
import { AppManagementLayout } from './app.management.layout';
import { AppProfileSidebarLayoutComponent } from './app.profilesidebar.layout.component';
import { SharedModule } from 'app/shared/shared.module';
import { ChatComponent } from "app/chat/chat/chat.component";
import { SplitButtonModule } from "primeng/splitbutton";
import { WeeklyWorklogSummaryComponent } from "app/log-my-work/weekly-worklog-summary/weekly-worklog-summary.component";

@NgModule({
    declarations: [
        AppLayoutComponent,
        AppBreadcrumbComponent,
        AppSidebarComponent,
        AppTopbarComponent,
        AppProfileSidebarComponent,
        AppMenuComponent,
        AppMenuitemComponent,
        AppLeftbarComponent,
        AppManagementLayout,
        AppProfileSidebarLayoutComponent
    ],
    imports: [
        BrowserModule,
        FormsModule,
        HttpClientModule,
        BrowserAnimationsModule,
        InputTextModule,
        SidebarModule,
        BadgeModule,
        RadioButtonModule,
        InputSwitchModule,
        TooltipModule,
        RippleModule,
        RouterModule,
        AppConfigModule,
        ButtonModule,
        BreadcrumbModule,
        DividerModule,
        MenuModule,
        DialogModule,
        DropdownModule,
        ReactiveFormsModule,
        RssFeedComponent,
        FeatureUnlockComponent,
        ScrollPanelModule,
        TreeModule,
        SharedModule,
        ChatComponent,
        SplitButtonModule,
        WeeklyWorklogSummaryComponent
    ],
})
export class AppLayoutModule { }
