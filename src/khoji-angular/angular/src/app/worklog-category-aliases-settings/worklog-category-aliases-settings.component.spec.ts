import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WorklogCategoryAliasesSettingsComponent } from './worklog-category-aliases-settings.component';

describe('WorklogCategoryAliasesSettingsComponent', () => {
  let component: WorklogCategoryAliasesSettingsComponent;
  let fixture: ComponentFixture<WorklogCategoryAliasesSettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ WorklogCategoryAliasesSettingsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WorklogCategoryAliasesSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
