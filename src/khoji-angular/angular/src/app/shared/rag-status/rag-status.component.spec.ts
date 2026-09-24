import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxSliderModule } from '@angular-slider/ngx-slider';
import { TooltipModule } from 'primeng/tooltip';
import { InputNumberModule } from 'primeng/inputnumber';
import { SkeletonModule } from 'primeng/skeleton';
import { MockStore } from '@ngrx/store/testing';
import { AppState } from 'app/states/app-states';
import { TrackingService } from 'app/services/tracking';

import { RagStatusComponent } from './rag-status.component';

describe('RagStatusComponent', () => {
  let component: RagStatusComponent;
  let fixture: ComponentFixture<RagStatusComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RagStatusComponent ],
      imports: [
        CommonModule,
        FormsModule,
        NgxSliderModule,
        TooltipModule,
        InputNumberModule,
        SkeletonModule
      ],
      providers: [
        { provide: TrackingService, useValue: { captureUserAction: jest.fn(), captureNavigationStep: jest.fn() } }
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RagStatusComponent);
    component = fixture.componentInstance;
    const store = TestBed.inject(MockStore<AppState>);
    store.setState({
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
