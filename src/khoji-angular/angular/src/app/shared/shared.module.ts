/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { NgxSliderModule } from '@angular-slider/ngx-slider';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ErrorComponent } from 'app/ui/error/error.component';
import { NgxEchartsModule } from 'ngx-echarts';
import { NgxSpinnerModule } from 'ngx-spinner';
import { ConfirmationService } from 'primeng/api';
import { CarouselModule } from 'primeng/carousel';
import { CheckboxModule } from 'primeng/checkbox';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputSwitchModule } from "primeng/inputswitch";
import { InputTextModule } from 'primeng/inputtext';
import { MessagesModule } from 'primeng/messages';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { SplitterModule } from 'primeng/splitter';
import { ChartComponent } from './chart/chart.component';
import { LegendAvg } from './chart/legend-avg.component';
import { LegendCount } from './chart/legend-count.component';
import { PiChartComponent } from './chart/pi-chart/pi-chart.component';
import { CheckboxComponent } from './checkbox.component';
import { ColorPickerComponent } from './color-picker/color-picker.component';
import { CustomCheckboxComponent } from './custom-checkbox.component';
import { DatatableButtonsComponent } from './datatable/datatable-buttons';
import { DatatableComponent } from './datatable/datatable.component';
import { PrimengTableComponent } from './datatable/primeng-table/primeng-table.component';
import { EscapePipe } from './escape.pipe';
import { FixHeaderTooltip } from './fix-header-tooltip.component';
import { InheritedSign } from './inherited-sign.component';
import { DashboardComponent } from './khoji-component-dashboard/khoji-component-dashboard.component';
import { KhojiIframeComponent } from './khoji-iframe/khoji-iframe.component';
import { MessageComponent } from './message/message.component';
import { ModalWrapperComponent } from './modal-wrapper/modal-wrapper.component';
import { VarDirective } from './ng-var.directive';
import { NoDataAvailableMessageComponent } from './no-data-available-message/no-data-available-message.component';
import { OpenModalIconComponent } from './open-modal-icon/open-modal-icon.component';
import { RagStatusWrapperComponent } from './rag-status-wrapper/rag-status-wrapper.component';
import { RagStatusComponent } from './rag-status/rag-status.component';
import { ReloadLinkComponent } from './reload-link/reload-link.component';
import { RequestPanelComponent } from './request-panel.component';
import { ResponsiveGridDirective } from './responsive-grid.directive';
import { SlideDirective } from './slider/slide.directive';
import { SliderComponent } from './slider/slider.component';
import { SpinnerComponent } from './spinner.component';
import { TimeRemainingPipe } from './time-remaining.pipe';
import { TooltipIconComponent } from './tooltip/tooltip-icon.component';
import { UploadImageComponent } from './upload-image/upload-image.component';
import { ChipsComponent } from './chips/chips.component';
import { ChipModule } from 'primeng/chip';
import { ProgressTemplate } from './progress-template.component';
import { DistributionTemplate } from './distribution-template';
import { InputNumberModule } from 'primeng/inputnumber';
import { MessageModule } from 'primeng/message';
import { SkeletonModule } from 'primeng/skeleton';

@NgModule({
  imports: [
    TableModule,
    TagModule,
    RouterModule,
    InputTextModule,
    CommonModule,
    NgxEchartsModule,
    NgxSpinnerModule,
    CheckboxModule,
    FormsModule,
    ToastModule,
    TooltipModule,
    SplitterModule,
    NgxSliderModule,
    ConfirmDialogModule,
    InputSwitchModule,
    MessagesModule,
    CarouselModule,
    ChipModule,
    InputNumberModule,
    MessageModule,
    SkeletonModule
  ],
  declarations: [
    EscapePipe,
    InheritedSign,
    FixHeaderTooltip,
    MessageComponent,
    CustomCheckboxComponent,
    ChartComponent,
    VarDirective,
    LegendCount,
    LegendAvg,
    CheckboxComponent,
    ModalWrapperComponent,
    RequestPanelComponent,
    ErrorComponent,
    PrimengTableComponent,
    DatatableComponent,
    OpenModalIconComponent,
    SliderComponent,
    SlideDirective,
    SpinnerComponent,
    NoDataAvailableMessageComponent,
    ResponsiveGridDirective,
    RagStatusComponent,
    RagStatusWrapperComponent,
    TooltipIconComponent,
    ColorPickerComponent,
    DatatableButtonsComponent,
    KhojiIframeComponent,
    UploadImageComponent,
    TimeRemainingPipe,
    DashboardComponent,
    ReloadLinkComponent,
    PiChartComponent,
    DistributionTemplate,
    ChipsComponent,
    ProgressTemplate,
  ],
  exports: [
    EscapePipe,
    InheritedSign,
    FixHeaderTooltip,
    MessageComponent,
    CustomCheckboxComponent,
    ChartComponent,
    VarDirective,
    LegendCount,
    LegendAvg,
    CheckboxComponent,
    ModalWrapperComponent,
    RequestPanelComponent,
    ErrorComponent,
    PrimengTableComponent,
    DatatableComponent,
    OpenModalIconComponent,
    SliderComponent,
    SlideDirective,
    SpinnerComponent,
    NoDataAvailableMessageComponent,
    ResponsiveGridDirective,
    RagStatusComponent,
    RagStatusWrapperComponent,
    TooltipIconComponent,
    ColorPickerComponent,
    DatatableButtonsComponent,
    KhojiIframeComponent,
    UploadImageComponent,
    TimeRemainingPipe,
    DashboardComponent,
    ReloadLinkComponent,
    PiChartComponent,
    DistributionTemplate,
    ChipsComponent,
    ProgressTemplate,
  ],
  providers: [ConfirmationService]
})
export class SharedModule { }
