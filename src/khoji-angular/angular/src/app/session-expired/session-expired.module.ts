/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SessionExpiredComponent } from './session-expired.component';

const routes: Routes = [
{ path: '', component: SessionExpiredComponent }
];
@NgModule({
  imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class SessionExpiredModule { }
