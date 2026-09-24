import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Constants } from 'app/constants';
import { FeatureFlagService } from 'app/services/feature.flag.service';
import { CustomField } from './admin.entities';

@Injectable({
  providedIn: 'root'
})
export class AdminService {

  constants = Constants;

  constructor(private router: Router) { }

  areCustomFieldsValid(customFieldsMap: CustomField) {
    if (
      customFieldsMap.KhojiTeamBoard ||
      customFieldsMap.KhojiEpicId ||
      customFieldsMap.KhojiStoryPoints ||
      customFieldsMap.KhojiSprintList ||
      customFieldsMap.KhojiHighLevelEstimate
    ) {
      return true;
    }
    return false;
  }

  handleCancel() {
    localStorage.setItem(this.constants.IS_DIRTY_STATE_ON_SOURCE_MAPPING, 'false');
    this.router.navigate([this.constants.KHOJI_DASHBOARD_PAGE]);
  }
}
