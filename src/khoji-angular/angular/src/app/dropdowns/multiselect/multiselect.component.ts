/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { Component, ElementRef, EventEmitter, HostListener, Input, OnInit, Output, ViewChild } from '@angular/core';
import { Store } from '@ngrx/store';
import { Constants } from 'app/constants';
import { KhojiConfigs } from 'app/interface/khoji-config.interface';
import { parseParametrizedString, convertToDate } from 'app/shared/helper-functions';
import { AppState } from 'app/states/app-states';
import { selectTranslation } from 'app/states/global-translations.selector';
import { Subscription } from 'rxjs';
import { DropdownItem } from '../dropdown-item';
import { environment } from 'app/../environments/environment';

export interface GroupSelectionLimit { grouping_value: string; limit: number; tooltip: string; };

@Component({
  selector: 'khoji-multiselect',
  templateUrl: './multiselect.component.html',
  styleUrls: ['./multiselect.component.scss']
})
export class MultiselectComponent implements OnInit {
  constants = Constants;
  translation: any;
  @ViewChild('searchTxt') searcInputElement: ElementRef;
  _items: DropdownItem[] = [];
  khojiConfig: KhojiConfigs;
  subscription = new Subscription();
  customItemText = false;
  closed = true;
  filter = '';
  allSelected = false;
  allFilteredSelected = false;
  singleSelection = false;
  groups: DropdownItem[] = [];
  _selectAllText: string;
  _selectAllFilteredText: string;
  _selectedItems: DropdownItem[] = [];
  hideDropdown = false;

  @Input() text = "select an item";
  @Input() selectAllText = 'Select All';
  @Input() selectAllFilteredText = 'Select all filtered results';
  @Input() unSelectAllFilteredText = 'Select all filtered results';
  @Input() noMatchingRecordsLabel = 'No matching records found';
  @Input() noDataLabel = 'No data available';
  @Input() fixedWidth = false;
  @Input() fullWidthDropdown = false;

  // limit selection inside the dropdown
  @Input() selectionLimit = Number.MAX_SAFE_INTEGER;
  @Input() limitReachedTooltip: string = '';
  @Input() groupSelectionLimit: GroupSelectionLimit = null;
  numberOfItemsSelectedFromGroup: number = 0;

  @Input() label: string;
  @Input() isDisabled = false;
  @Input() classNames: string;
  @Input() dataTestName: string;
  @Input() applyStatusStyle = false;
  @Input() autoSelectSingle = false;
  @Input() closeOnSelection = false;
  @Input() useApplyButton = false;
  @Input() selectionRequired = false;
  @Input() selectionRequiredMessage = 'Select an item';
  @Input() emptyAndNotAvailableCheck = false;
  @Input() popupRightAlign = false;
  @Input() maxChips = 1;
  @Input() loading = false;
  @Input('itemText') itemText: (item: DropdownItem) => string;
  userSelectedGroupsExpandedState: string[] = [];

  @Input() filterDataBasedOnDate = false;
  @Input() filterDataPreviousNMonths = 3;
  allDropdownItems: DropdownItem[];

  @Input() enablePagination = false;
  @Input() numberOfItemsToLoadInPagination = 2;

  /**
   * this is used to limit multiselect to act as single select
   *
   * @memberof MultiselectComponent
   */
  @Input() singleSelect = false;
  showNEntries: number = 1;
  btnIds: string[] = ['loadMoreBtn', 'showAllBtn'];

  filterDataBasedOnDateNote: string = "Note: Last %s1 months releases are being displayed.";

  @Input()
  set items(items: DropdownItem[]) {
    if (Array.isArray(items) && (this._items.length !== items.length || this.areItemsChanged(this._items, items) || this.hasChanged(items.filter(item => item.item_selected)))) {
      this.updateConfigurationsIfPaginationIsEnabled(items);
      this.populateDropdownItems(items, true);
    }
  }

  private updateConfigurationsIfPaginationIsEnabled(items: DropdownItem[]) {
    if (this.enablePagination) {
      this.showNEntries = this.numberOfItemsToLoadInPagination;
      this.allDropdownItems = items.map(item => item.is_group ? this.groups.find(g => g.item_id === item.item_id) || item : item);
      this._items = [];
    }
  }

  get items() {
    return this._items;
  }

  /**
   * This method is responsible for displaying the dropdown items.
   *
   * If `filterDataBasedOnDate` is true, it filters the list according to a
   * configurable number of months based on the start date.
   *
   * @param items An array of items to display in the dropdown
   */
  private populateDropdownItems(items: DropdownItem[], updateSelection: boolean) {
    if (this.filterDataBasedOnDate) {
      this.filterItemsBasedonDateAndCache(items);
    }
    else if (this.enablePagination) {
      this.showPaginatedDropdown(items);
    }
    else {
      this._items = items.map(item => item.is_group ? this.groups.find(g => g.item_id === item.item_id) || item : item);
    }

    if (this.singleSelect && this.selectedItems.length > 1) {
      this._items.forEach(item => item.item_selected = item.item_id === this.selectedItems[0].item_id);
      this.triggerChange();
    }

    if (updateSelection) {
      const selected = this.selectedItems;
      this._selectedItems = selected;
    }

    this.groups = this._items.filter(item => item.is_group);

    //Recording groups expand state
    if (this.filter === '') {
      this.userSelectedGroupsExpandedState = this.groups.filter(g => g.expand).map(g => g.item_id);
    }
    this.selectSingleAuto(this._items.filter(item => !item.is_group));
    this.updateGroups();
    this.updateSelectionText();

    this.hideOrShowDropdown();
    this.notAvailableTeamboardAtTop();
  }

  /**
   * This method check for selection and if found
   * it evaluates the range and load dropdown till
   * that page. If there is no selection it will load
   * dropdown from start
   *
   * @param items
   */
  showPaginatedDropdown(items: DropdownItem[]) {
    const interval = this.numberOfItemsToLoadInPagination;
    let lastSelectedIndex = -1;

    // find the last selected index
    for (let i = 0; i < items.length; i++) {
      if (items[i].item_selected) {
        lastSelectedIndex = i;
      }
    }

    if (lastSelectedIndex != -1) {
      // calculate the interval range based on the last selected index
      const intervalStart = Math.floor(lastSelectedIndex / interval) * interval;
      const intervalEnd = Math.min(items.length, intervalStart + interval);
      this.showNEntries = intervalEnd > this.showNEntries ? intervalEnd : this.showNEntries;
    }

    this._items = items.map(item => item.is_group ? this.groups.find(g => g.item_id === item.item_id) || item : item).slice(0, this.showNEntries);
  }

  @Output() selectionChange = new EventEmitter<{ selected: DropdownItem[], allItems: DropdownItem[]; }>();

  private filterItemsBasedonDateAndCache(items: DropdownItem[]) {
    const today = new Date();
    const filterMonthRange = new Date(today.getFullYear(), today.getMonth() - this.filterDataPreviousNMonths, today.getDate());

    this._items = items.map(item => {
      if (item.is_group) {
        const group = this.groups.find(g => g.item_id === item.item_id);
        return group ? { ...group, is_group: true } : item;
      } else if (item?.item_cached || this.selectedItemsUnique.find(g => g.item_id === item.item_id)) {
        // include item if cached is true or release is in selected list
        return item;
      } else if (item.item_date) {
        // include item if item_date falls within the time range
        const [startDay, startMonth, startYear] = item.item_date.split('/');
        const startDate = new Date(parseInt(startYear), parseInt(startMonth) - 1, parseInt(startDay));
        return startDate >= filterMonthRange && startDate <= today ? item : null;
      } else {
        return null;
      }
    }).filter(item => item !== null);


    this.allDropdownItems = items.map(item => item.is_group ? this.groups.find(g => g.item_id === item.item_id) || item : item);

    //when even after filtering data is same, hide the message
    if (this._items.filter(item => item.is_group != true).length
      === this.allDropdownItems.filter(item => item.is_group != true).length) {
      this.filterDataBasedOnDate = false;
    }
    //when there is no data available after filtering then show all data
    else if (this._items.filter(item => item.is_group != true).length === 0) {
      this._items = this.allDropdownItems;
      this.filterDataBasedOnDate = false;
    }
    else {
      this.filterDataBasedOnDateNote = parseParametrizedString(this.translation.multiSelectDropdown.filterDataBasedOnDateNote, this.filterDataPreviousNMonths);
    }
  }

  /** avoid repeated calls */
  get filteredItems() {
    return this.items.filter(t => t.is_group || this.shouldFilterForSearch(t));
  }

  /** current selection. avoid repeated calls */
  get selectedItems() {
    return this.items.filter(t => !t.is_group && t.item_selected);
  }

  get selectedItemsUnique() {
    return this.selectedItems.filter((currentElement, currentElementIndex, entireArray) => currentElementIndex === entireArray.findIndex(itemAtIndex => itemAtIndex.item_id === currentElement.item_id && itemAtIndex.item_text === currentElement.item_text));
  }

  hasChanged(selectedItems: DropdownItem[]) {
    return JSON.stringify(this._selectedItems.map(item => item.item_id).sort()) !== JSON.stringify(selectedItems.map(item => item.item_id).sort());
  }

  areItemsChanged(firstItem: DropdownItem[], secondItem: DropdownItem[]) {
    return JSON.stringify(firstItem.map(item => item.item_id + item.item_description)) !== JSON.stringify(secondItem.map(item => item.item_id + item.item_description));
  }

  constructor(private store: Store<AppState>, private eleRef: ElementRef<HTMLDivElement>) { }

  ngOnInit() {
    this.subscription.add(
      this.store.pipe(selectTranslation).subscribe((translation) => {
        this.translation = translation;
      })
    );

    this.subscription.add(this.store.select('globalConfigs').subscribe(data => {
      this.khojiConfig = data.khoji;

      this.hideOrShowDropdown();
      this.notAvailableTeamboardAtTop();
    }));

    this.customItemText = typeof this.itemText === 'function';
    this.updateGroups();
    this.updateSelectionText();
  }

  toggleDropdown(event: PointerEvent) {
    if (this.singleSelection || (<HTMLElement>event.target).classList.contains('fa-remove')) return;

    if (this.closed) {
      this.open();
    }
    else {
      this.close();
    }
  }

  open() {
    this.closed = false;
    this.filter = '';
    this.updateGroups();
    this.updateSelectionText();
    // focus search txt
    setTimeout(() => {
      if (this.searcInputElement) {
        const searchTxt = this.searcInputElement.nativeElement as HTMLElement;
        searchTxt.focus();
      }
    });
  }

  close() {
    this.closed = true;

    // reset if hiding and change not triggered
    if (this.hasChanged(this.selectedItems)) {
      this.reset();
    }
  }

  @HostListener('document:click', ['$event'])
  documentClick(event: PointerEvent) {
    const targetId = (event.target as HTMLDivElement).id;
    if (!this.eleRef.nativeElement.contains(event.target as HTMLDivElement) && !this.btnIds.includes(targetId) && !this.closed) {
      this.close();
    }
  }

  updateSelectionText() {
    const selected = this.selectedItems;

    const filtered = this.filteredItems.filter(item => !item.is_group);
    const filteredSelected = filtered.filter(t => t.item_selected);

    const items = this.items.filter(t => !t.is_group);
    this.allSelected = items.length > 0 && items.length === selected.length;
    this.allFilteredSelected = filtered.length > 0 && filtered.length === filteredSelected.length;

    this._selectAllText = this.selectAllText;
    this._selectAllFilteredText = this.allFilteredSelected ? this.unSelectAllFilteredText : this.selectAllFilteredText;
    this.notAvailableTeamboardAtTop();
  }

  triggerChange() {
    const selected = this.selectedItems;

    if (this.hasChanged(selected)) {
      this.selectionChange.emit({ selected: selected, allItems: this.items });
      this._selectedItems = selected;

      if (this.closeOnSelection || this.useApplyButton) {
        this.closed = true;
      }
    }
  }

  hideOrShowDropdown() {
    if (this.emptyAndNotAvailableCheck) {
      this.hideDropdown = false;
      // Empty dropdown
      if (this._items.length < 1) {
        this.hideDropdown = true;
      }
      // Not Available dropdown
      if (this._items.length == 1 && this._items[0].item_text.toString() == this.khojiConfig?.unRegisteredTeamBoardName) {
        this.hideDropdown = true;
      }
    }
  }

  notAvailableTeamboardAtTop() {
    // Shift (Not Avialable) TeamBoard at start of an Array if exist
    //WARN: assert from munsab
    const foundIdx = this._items.findIndex(el => el.item_text.toString() == this.khojiConfig?.unRegisteredTeamBoardName);
    if (foundIdx > 0) {
      this._items.unshift(this._items[foundIdx]);
      this._items.splice(foundIdx + 1, 1);
    }
  }

  reset() {
    this.items
      .forEach(item => {
        item.item_selected = this._selectedItems.findIndex(s => s.item_id === item.item_id) !== -1;
      });

    this.updateGroups();
    this.updateSelectionText();
    this.closeDropdown();
  }

  closeDropdown() {
    this.closed = true;
  }

  selectAll(val: boolean, triggerChange?: boolean) {
    this.items.filter(item => !item.is_group).forEach(item => item.item_selected = val);
    this.updateGroups();
    this.updateSelectionText();

    if (!this.useApplyButton || triggerChange) {
      this.triggerChange();
    }
  }

  selectAllFiltered(val: boolean) {
    this.filteredItems.filter(item => !item.is_group).forEach(item => item.item_selected = val);
    this.updateGroups();
    this.updateSelectionText();

    if (!this.useApplyButton) {
      this.triggerChange();
    }
  }

  selectItem(item: DropdownItem, val: boolean) {
    if (this.singleSelect && val === true) {
      this._items.forEach(t => t.item_selected = t.item_id === item.item_id && t.item_text === item.item_text);
    }
    else {
      this._items.filter(t => t.item_id === item.item_id && t.item_text === item.item_text).forEach(t => t.item_selected = val);
    }
  }

  selectSingle(item?: DropdownItem, val?: boolean, overrideUseApplyButton?: boolean) {
    let _triggerChange = false;

    // selection changed from passing item and val
    if (item) {
      this.selectItem(item, val);
      _triggerChange = !this.useApplyButton || overrideUseApplyButton;

      if (_triggerChange) {

        if (item.is_group) {
          const children = this.getChildren(item).filter(this.shouldFilterForSearch.bind(this));
          children.forEach(c => this.selectItem(c, val));
        }
        else {
          const isSelected = val;
          const deselectingSelected = !val && this._selectedItems.findIndex(s => s.item_id === item.item_id) > -1;
          const selectionChanged = isSelected || deselectingSelected;
          _triggerChange = selectionChanged;
        }
      }
    }
    // selection changed from binding
    else {
      _triggerChange = !this.useApplyButton;
    }

    if (_triggerChange) {
      this.triggerChange();
    }

    this.updateGroups();
    this.updateSelectionText();
  }

  selectSingleAuto(items: DropdownItem[]) {
    if (this.autoSelectSingle && !this.filterDataBasedOnDate) {
      if (items.length === 1) {
        this.selectSingle(items[0], true, true);
        this.singleSelection = true;
      }
    }
  }

  getItemText(item: DropdownItem) {
    return this.customItemText ? this.itemText(item) : item.item_text;
  }

  getItemStyle(item: DropdownItem) {
    const style = {
      'selected': item.item_selected,
      'hide': item.hide,
      'child': this.groups.length && !item.is_group,
      'p-disabled': !item.item_selected && this.selectedItems.length >= this.selectionLimit
    };

    if (this.applyStatusStyle && typeof item.item_status === 'string') {
      style[Constants.DROPDOWN_STATUS_STYLE[item.item_status.toLowerCase()]] = true;
    }

    if (this.groupSelectionLimit) {
      const itemInGroup: boolean = item.grouping_value === this.groupSelectionLimit.grouping_value;

      if (itemInGroup) {
        if (this.numberOfItemsSelectedFromGroup >= this.groupSelectionLimit.limit) return {
          ...style,
          'p-disabled group': itemInGroup && !item.item_selected // group is dummy css class so that p-disabled doesnt get override
        };
      }
    }

    return style;
  }

  updateGroups() {
    if (this.groups.length === 0) return;

    for (const group of this.groups) {
      const children = this.getChildren(group).filter(this.shouldFilterForSearch.bind(this));
      group.item_selected = children.length > 0 && children.filter(c => c.item_selected).length === children.length;
      group.children_count = children.length;

      group.hide = group.children_count === 0;

      if (this.filter !== '') {
        group.expand = true;
      }
      else {
        group.expand = this.userSelectedGroupsExpandedState.includes(group.item_id) || false;
      }

      children.forEach(ch => {
        ch.hide = !group.expand;
      });
    }
  }

  getChildren(group: DropdownItem) {
    return this.items.filter(t => !t.is_group && t.grouping_key === group.grouping_key && t.grouping_value === group.grouping_value);
  }

  getItemsNotHidden(filteredItems: DropdownItem[]) {
    return filteredItems.filter(i => !i.hide);
  }

  toggleExpand(group: DropdownItem) {
    const children = this.getChildren(group);
    group.expand = !group.expand;

    this.changeInUserSelectedGroupsExpandState(group);

    for (const item of children) {
      item.hide = !group.expand;
    }
  }

  changeInUserSelectedGroupsExpandState(group: DropdownItem) {
    if (this.userSelectedGroupsExpandedState.includes(group.item_id)) {
      const index = this.userSelectedGroupsExpandedState.indexOf(group.item_id);
      if (index > -1) {
        this.userSelectedGroupsExpandedState.splice(index, 1);
      }
    }
    else if (group.expand) {
      this.userSelectedGroupsExpandedState.push(group.item_id);
    }
  }

  shouldFilterForSearch(item: DropdownItem) {
    const term = this.filter?.toLowerCase();
    return this.getItemText(item)?.toLowerCase()?.match(term) || item.item_subtext?.toLowerCase()?.match(term) || item.item_status_label?.toLowerCase()?.match(term);
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  showAllData() {
    this.filterDataBasedOnDate = false;
    this.populateDropdownItems([...this.allDropdownItems], true);
  }

  showMoreEntries() {
    this.showNEntries += this.numberOfItemsToLoadInPagination;
    if (this.showNEntries >= this.allDropdownItems.length) {
      this.populateDropdownItems([...this.allDropdownItems], false);
    }
    else {
      const moreNItems = this.allDropdownItems.map(item => item.is_group ? this.groups.find(g => g.item_id === item.item_id) || item : item)
        .slice(0, this.showNEntries);
      this.populateDropdownItems([...moreNItems], false);
    }
  }

  checkIfAllItemsAreDisplayed() {
    return this.allDropdownItems?.length === this._items?.length;
  }

  isSelectionLimitNotApplied(): boolean {
    return this.selectionLimit === Number.MAX_SAFE_INTEGER;
  }

  updateGroupingLimits(item: DropdownItem, event: boolean) {
    const itemInGroup: boolean = item.grouping_value === this.groupSelectionLimit?.grouping_value;
    if (itemInGroup) {
      if (event) this.numberOfItemsSelectedFromGroup++;
      else this.numberOfItemsSelectedFromGroup--;
    }
  }

  getTooltipText(item) {
    if (!item.item_selected && this.selectedItems.length >= this.selectionLimit) return this.limitReachedTooltip;

    if (this.groupSelectionLimit) {
      const itemInGroup: boolean = item.grouping_value === this.groupSelectionLimit.grouping_value;

      if (itemInGroup) {
        if (this.numberOfItemsSelectedFromGroup >= this.groupSelectionLimit.limit && !item.item_selected) return this.groupSelectionLimit.tooltip;
      }
    }

    return '';
  }
}

