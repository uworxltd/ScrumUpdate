/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { AfterContentChecked, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { DropdownName } from 'app/element-names';
import { environment } from 'environments/environment';

@Component({
  selector: 'khoji-single-select-dropdown',
  templateUrl: './single-select-dropdown.component.html',
  styleUrls: ['./single-select-dropdown.component.scss']
})
export class SingleSelectDropdownComponent implements OnInit, AfterContentChecked {

  environment: any = environment;

  dropdownName = DropdownName;
  @Input() selectedItem: any;
  @Input() classNames: string;
  @Input() className: string;
  @Input() currentValue: string;
  @Input() disabled: boolean = false;
  @Input() placeholder: string;
  @Input() dropdownValues: { value: string, label: string }[] = [];
  @Input() showClear: boolean = false;
  @Input() filter: boolean = false;
  @Input() emptyDropDownMessage: string = 'No results found';
  emptyFilterMessage:string = 'No results found';
  @Input() appendTo: string = null;
  @Input() showTitleWithDDOptions: boolean = false;
  @Input() loading = false;
  @Input() group: boolean = false;
  @Input() optionGroupLabel: string = 'label';
  @Input() optionGroupChildren: string = 'items';

  @Output() selectedValue = new EventEmitter<string>();
  @Output() emitValueOnSelection = new EventEmitter<string>();
  @Output() onClear = new EventEmitter();
  constructor() { }

  ngAfterContentChecked(): void {
    this.selectedValue.emit(this.selectedItem);
  }

  ngOnInit() {
  }

  onSelect(value: any) {
    this.emitValueOnSelection.emit(this.selectedItem);
  }
}
