/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { NgModule } from "@angular/core";
import { PicklistComponent } from "./picklist.component";
import { CommonModule } from "@angular/common";
import { SharedModule } from "../shared.module";
import {ConfirmPopupModule} from 'primeng/confirmpopup';
import { SkeletonModule } from "primeng/skeleton";
import { TooltipModule } from "primeng/tooltip";
import { DividerModule } from "primeng/divider";
import { ButtonModule } from "primeng/button";
import { RippleModule } from "primeng/ripple";
import { ProgressSpinnerModule } from "primeng/progressspinner";

@NgModule({
    declarations: [
        PicklistComponent
    ],
    imports: [
        CommonModule,
        SharedModule,
        ConfirmPopupModule,
        SkeletonModule,
        TooltipModule,
        DividerModule,
        ButtonModule,
        RippleModule,
        ProgressSpinnerModule,
    ],
    exports: [
        PicklistComponent,
    ]
})
export class PicklistModule {

}
