import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OpenModalIconComponent } from './open-modal-icon.component';

describe('OpenModalIconComponent', () => {
  let component: OpenModalIconComponent;
  let fixture: ComponentFixture<OpenModalIconComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ OpenModalIconComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(OpenModalIconComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
