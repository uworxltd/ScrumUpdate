import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { ManageSettingsComponent } from './manage-settings.component';
import { UnleashService } from 'app/services/unleash.service';

describe('ManageSettingsComponent', () => {
  let component: ManageSettingsComponent;
  let fixture: ComponentFixture<ManageSettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ ManageSettingsComponent, HttpClientTestingModule ],
      providers: [
        { provide: UnleashService, useValue: { isIntergated: () => false, isFeatureEnabled: jest.fn() } },
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManageSettingsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
