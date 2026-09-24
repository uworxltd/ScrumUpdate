import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { RssFeedComponent } from './rss-feed.component';
import { RssFeedService } from 'app/services/rss-feed.service';
import { TrackingService } from 'app/services/tracking';

describe('RssFeedComponent', () => {
  let component: RssFeedComponent;
  let fixture: ComponentFixture<RssFeedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ RssFeedComponent, NoopAnimationsModule ],
      providers: [
        { provide: RssFeedService, useValue: { fetchFromKBS: jest.fn().mockResolvedValue([]) } },
        { provide: TrackingService, useValue: { captureUserAction: jest.fn(), captureNavigationStep: jest.fn() } }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RssFeedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
