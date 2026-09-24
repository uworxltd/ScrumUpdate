import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MultiselectComponent } from './multiselect.component';
import { DropdownItem } from '../dropdown-item';

describe('MultiselectComponent', () => {
  let component: MultiselectComponent;
  let fixture: ComponentFixture<MultiselectComponent>;
  let spy;
  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [FormsModule],
      declarations: [MultiselectComponent],
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MultiselectComponent);
    component = fixture.componentInstance;
    component.allSelected = true;
    component.items = [
      { item_id: 'Platform', item_text: 'Platform', item_selected: false } as DropdownItem,
    ];
  });

  it('should create MultiselectComponent', () => {
    expect(component).toBeTruthy();
  });

  it('should call changed on select all', () => {
    spyChangeItem();
    component.selectAll(true);
    spyHaveCalled();
  });

  it('should call changed on select All Filtered', () => {
    spyChangeItem();
    component.selectAllFiltered(true);
    spyHaveCalled();
  });

  it('should call changed on selectSingle', () => {
    spyChangeItem();
    component.selectSingle({ item_id: 'Platform', item_text: 'Platform' } as DropdownItem, true);
    spyHaveCalled();
  });

  function spyHaveCalled(){
    expect(spy).toHaveBeenCalled();
  }

  function spyChangeItem(){
    spy = jest.spyOn(component.selectionChange, 'emit');
  }

});
