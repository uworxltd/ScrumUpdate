/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PagenotfoundComponent } from './pagenotfound.component';

const route: Routes = [
  { path: '', component: PagenotfoundComponent },
];
@NgModule({
  imports: [RouterModule.forChild(route)],
  exports: [RouterModule]
})
export class NotfoundRoutingModule { }
