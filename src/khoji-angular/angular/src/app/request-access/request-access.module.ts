/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RequestAccessComponent } from './request-access.component';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';

const routes: Routes = [
  { path: '', component: RequestAccessComponent }
];
@NgModule({
  declarations: [
    RequestAccessComponent
  ],
  imports: [
    RouterModule.forChild(routes),
    ButtonModule,
    RippleModule,
  ],
  exports: [
    RouterModule
  ],
})
export class RequestAccessModule { }
