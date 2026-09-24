import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { MessageService } from 'primeng/api';

import { ScrumUpdateComponent } from './scrum-update.component';
import { CacheService } from 'app/caching/cache.service';
import { UnleashService } from 'app/services/unleash.service';

describe('PulseComponent', () => {
  let component: ScrumUpdateComponent;
  let fixture: ComponentFixture<ScrumUpdateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScrumUpdateComponent, HttpClientTestingModule],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: {} } },
        { provide: Title, useValue: { setTitle: jest.fn() } },
        { provide: CacheService, useValue: { loadConfig: jest.fn(), getRequestConfig: jest.fn() } },
        { provide: UnleashService, useValue: { isIntergated: () => false, isFeatureEnabled: jest.fn() } },
        MessageService,
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ScrumUpdateComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
