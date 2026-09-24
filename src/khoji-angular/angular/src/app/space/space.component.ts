import { AfterViewChecked, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Constants } from 'app/constants';
import { AppState } from 'app/states/app-states';
import { fetchWorkSpaces } from 'app/states/app.actions';
import { selectKhojiUserProfile } from 'app/user-profile/state/user-profile.selectors';
import { UnleashService } from 'app/services/unleash.service';
import { getUserEmailSavedInToken } from 'app/shared/helper-functions';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'khoji-space',
  templateUrl: './space.component.html',
  styleUrls: ['./space.component.scss'],
})
export class SpaceComponent implements OnInit, AfterViewChecked {
  constructor(private store: Store<AppState>, private route: ActivatedRoute, private router: Router, private cdr: ChangeDetectorRef, private unleashService: UnleashService) { }

  ngOnInit() {
    sessionStorage.removeItem(Constants.INSTANCE_ID);
    this.store.dispatch(fetchWorkSpaces());

    const userProfile$ = this.store.pipe(selectKhojiUserProfile, filter(profile => !!profile?.id));

    userProfile$.subscribe(profile => {
      this.unleashService.setUserId(profile.id.toString());
      this.unleashService.setUserEmail(profile.email);
    });

    this.route.paramMap.subscribe((params: ParamMap) => {
      const spaceId = params.get(Constants.SPACE_ID);

      if (!this.route.firstChild) {
        this.router.navigate(['space']);
      } else if (Number.isNaN(Number(spaceId))) {
        this.router.navigate(['space']);
      } else {
        sessionStorage.storeItem(Constants.SPACE_ID, spaceId);
      }
    });

    const email = getUserEmailSavedInToken();
    if (email) {
      this.unleashService.setUserEmail(email);
    }
  }

  ngAfterViewChecked() {
    this.cdr.detectChanges();
  }
}
