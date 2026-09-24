import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SingleSelectDropdownComponent } from './single-select-dropdown.component';

describe('BaseFieldDropdownComponent', () => {
  let component: SingleSelectDropdownComponent;
  let fixture: ComponentFixture<SingleSelectDropdownComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SingleSelectDropdownComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SingleSelectDropdownComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
