import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LinkToMSTeamsComponent } from './link-to-msteams.component';

describe('LinkToMSTeamsComponent', () => {
  let component: LinkToMSTeamsComponent;
  let fixture: ComponentFixture<LinkToMSTeamsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LinkToMSTeamsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(LinkToMSTeamsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
