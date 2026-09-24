/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SharedModule } from 'app/shared/shared.module';
import { DropdownModule } from 'primeng/dropdown';
import { TooltipModule } from 'primeng/tooltip';
import { MultiselectComponent } from './multiselect/multiselect.component';
import { SingleSelectDropdownComponent } from './single-select-dropdown/single-select-dropdown.component';
import { TreeSelectComponent } from './tree-select/tree-select.component';

@NgModule({
  imports: [
    CommonModule,
    SharedModule,
    FormsModule,
    DropdownModule,
    TooltipModule
  ],
  declarations: [
    MultiselectComponent,
    SingleSelectDropdownComponent,
    TreeSelectComponent,
  ],
  exports: [
    MultiselectComponent,
    SingleSelectDropdownComponent,
    TreeSelectComponent,
  ]
})
export class DropdownsModule { }
