import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { NgxSliderModule } from '@angular-slider/ngx-slider';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { TooltipModule } from 'primeng/tooltip';
import { InputNumberModule } from 'primeng/inputnumber';
import { SkeletonModule } from 'primeng/skeleton';
import { ConfirmationService } from 'primeng/api';
import { MockStore } from '@ngrx/store/testing';
import { AppState } from 'app/states/app-states';
import { ConfigService } from 'app/services/config.service';
import { CacheService } from 'app/caching/cache.service';
import { TrackingService } from 'app/services/tracking';

import { RagStatusWrapperComponent } from './rag-status-wrapper.component';
import { RagStatusComponent } from '../rag-status/rag-status.component';

describe('RagStatusWrapperComponent', () => {
  let component: RagStatusWrapperComponent;
  let fixture: ComponentFixture<RagStatusWrapperComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RagStatusWrapperComponent, RagStatusComponent ],
      imports: [
        CommonModule,
        FormsModule,
        NgxSliderModule,
        ButtonModule,
        CheckboxModule,
        TooltipModule,
        InputNumberModule,
        SkeletonModule
      ],
      providers: [
        { provide: ConfirmationService, useValue: { close: jest.fn() } },
        { provide: TrackingService, useValue: { captureUserAction: jest.fn(), captureNavigationStep: jest.fn() } },
        { provide: ConfigService, useValue: { isComponentEnabled$: jest.fn().mockReturnValue(of(true)) } },
        { provide: CacheService, useValue: { clearCache: jest.fn() } }
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RagStatusWrapperComponent);
    component = fixture.componentInstance;
    const store = TestBed.inject(MockStore<AppState>);
    store.setState({
      globalTranslations: {
        translation: {
          error: { adminAccessRequired: 'Admin access required' },
          ragConfig: {
            ragStatuses: { amber: 'Amber', red: 'Red', green: 'Green' },
            button: { save: 'Save', clear: 'Clear' }
          }
        }
      },
      userProfile: {
        workspace: undefined,
        workspaces: [{
          id: 1,
          instances: [{
            id: 1,
            instanceUser: { accessLevelCode: 'ADMIN' }
          }]
        }],
        spaceId: 1,
        instanceId: 1
      }
    } as any);
    store.refreshState();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
