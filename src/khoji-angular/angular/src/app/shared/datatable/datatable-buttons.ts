import { Component, EventEmitter, Input, Output } from "@angular/core";

@Component({
    selector: 'khoji-datatable-buttons',
    template: `
        <div class="display-inherit">
            <div class="dropdown" class="float-right">
                <button [hidden]="hideExportButton" [disabled]="disableExportButton"
                    (click)="exportButtonClick.emit($event)" class="dt-button dt-export-file-button"
                    type="button" title="Export all or selected row(s)" data-toggle="dropdown" id="dropdownMenuLink"
                    aria-haspopup="true" aria-expanded="false">
                    <span><i class="fa fa-file-excel-o"></i></span>
                </button>
                <div
                    id="export-buttons" class="export-dropdown-menu dropdown-menu" aria-labelledby="dropdownMenuLink">
                    <button pButton class="export-dropdown-item dt-export-file-button dropdown-item buttons-copy"
                        type="button" data-test="exportToClipboard-button"
                        (click)="copyClick.emit($event)"><span>Copy</span></button>
                    <button pButton class="export-dropdown-item dt-export-file-button dropdown-item buttons-excel"
                        type="button" data-test="exportToExcel-button"
                        (click)="excelClick.emit($event)"><span>Excel</span></button>
                    <button class="export-dropdown-item dt-export-file-button dropdown-item buttons-csv" pButton
                        type="button" data-test="exportToCSV-button"
                        (click)="csvClick.emit($event)"><span>CSV</span>
                    </button>
                </div>
        </div>
    `
})
export class DatatableButtonsComponent {
    @Input() hideExportButton = false;
    @Input() disableExportButton = false;
    @Output() exportButtonClick = new EventEmitter<any>();
    @Output() copyClick = new EventEmitter<any>();
    @Output() excelClick = new EventEmitter<any>();
    @Output() csvClick = new EventEmitter<any>();
}