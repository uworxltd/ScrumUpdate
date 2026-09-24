import { CommonModule } from '@angular/common';
import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { Store } from '@ngrx/store';
import { RAG_COLOR_CODES, WORKLOG_PERCENTAGE_THRESHOLD, WORKLOG_RAG_SLIDER_CONFIG } from 'app/constants.configs';
import { SharedModule } from 'app/shared/shared.module';
import { AppState } from 'app/states/app-states';
import { fetchConfigs } from 'app/states/app.actions';
import { selectServerConfig } from 'app/states/global-configs.selector';
import { WorklogGeneralSettingsComponent } from 'app/team-worklog/worklog-general-settings/worklog-general-settings.component';
import { selectInstanceDetail } from 'app/user-profile/state/user-profile.selectors';
import { InstanceDetails } from 'app/user-profile/state/user-profile.states';
import { MenuItem } from 'primeng/api';
import { DividerModule } from 'primeng/divider';

import { MenuModule } from 'primeng/menu';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

enum InstanceTemplates{
  GENERAL_SETTINGS = 0,
  RAG_SETTINGS = 1
};

@Component({
  selector: 'khoji-instane-manage-feature',
  templateUrl: './instance-manage-feature.component.html',
  styleUrls: ['./instance-manage-feature.component.scss'],
  standalone: true,
  imports: [
    MenuModule,
    DividerModule,
    WorklogGeneralSettingsComponent,
    CommonModule,
    SharedModule
  ]
})
export class InstanceManageFeatureComponent implements OnInit {

  items: MenuItem[] = [];
  subscription: Subscription = new Subscription();
  instanceDetails: InstanceDetails;
  currentTemplateIndex: number = InstanceTemplates.GENERAL_SETTINGS;
  ragColorCodes: any;
  worklogPercentageThreshold: any;
  worklogRagSliderConfig: any;
  worklogThresholdPropKey = WORKLOG_PERCENTAGE_THRESHOLD;

  @ViewChild('worklogGeneralSettings') worklogSettingsTemplate : TemplateRef<any>;
  @ViewChild('ragStatus') ragStatusTemplate : TemplateRef<any>;


  constructor(private store: Store<AppState>) { }

  ngOnInit(): void {

    const instanceDetails$ = this.store.pipe(selectInstanceDetail, filter(instanceDetails => instanceDetails != undefined));
    this.subscription.add(instanceDetails$.subscribe(instanceDetails => {
      this.instanceDetails = instanceDetails;
    }));

    this.store.dispatch(fetchConfigs({propKeys: [RAG_COLOR_CODES, WORKLOG_PERCENTAGE_THRESHOLD, WORKLOG_RAG_SLIDER_CONFIG]}));

    const serverConfigs$ = this.store.pipe(selectServerConfig);
    this.subscription.add(serverConfigs$.subscribe(data => {
      this.ragColorCodes = data[RAG_COLOR_CODES];
      this.worklogPercentageThreshold = data[WORKLOG_PERCENTAGE_THRESHOLD];
      this.worklogRagSliderConfig = data[WORKLOG_RAG_SLIDER_CONFIG];

    }));

    this.items = [
      { label: 'General settings', command: (event) => this.setCurrentTemplate(InstanceTemplates.GENERAL_SETTINGS), id: InstanceTemplates.GENERAL_SETTINGS.toString() },
      { label: 'RAG settings', command: (event) => this.setCurrentTemplate(InstanceTemplates.RAG_SETTINGS), id: InstanceTemplates.RAG_SETTINGS.toString() }
    ];
  }

  renderTemplate(): TemplateRef<any>{
    switch(this.currentTemplateIndex){
      case InstanceTemplates.GENERAL_SETTINGS:
        return this.worklogSettingsTemplate;
      default:
      return this.ragStatusTemplate;
    }
  }

  setCurrentTemplate(templateIndex: InstanceTemplates): void{
    this.currentTemplateIndex = templateIndex;
  }

  isActiveTemplate(item: any): boolean {
    return true
  }

}
