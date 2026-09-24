/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AccessdeniedComponent } from './accessdenied.component';

@NgModule({
  imports: [
    RouterModule.forChild([
      { path: '', component: AccessdeniedComponent }
    ])
  ],
  exports: [RouterModule]
})
export class AccessdeniedRoutingModule { }
