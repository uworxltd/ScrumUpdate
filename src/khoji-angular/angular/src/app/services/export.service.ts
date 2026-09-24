/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { Injectable } from "@angular/core";
import { Constants } from "app/constants";
import { MessageService } from "primeng/api";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
const Excel = require('exceljs');

@Injectable({
    providedIn: "root"
})
export class ExportService {
    constructor(private messageService: MessageService) { }

    exportCopy(cols: any[], rows: any[], tableTitle?: string, isInherited: boolean = false, issueDeepScanning: boolean = true) {
        let data: any[] = this.getTableDataForCopy(cols, rows);
        data = this.convertArraysToString(data);
        const worksheet = XLSX.utils.json_to_sheet(data);
        let worksheetText = XLSX.utils.sheet_to_txt(worksheet);

        if (worksheetText.includes("ÿþ", 0)) {
            worksheetText = worksheetText.substring(2);
        }
        worksheetText = isInherited && issueDeepScanning ? tableTitle + "\n\n" + Constants.NOTE_FIX_VERSION + "\n\n" + worksheetText : tableTitle + "\n\n" + worksheetText;
        const elem = document.createElement('textarea');
        elem.value = worksheetText;
        document.body.appendChild(elem);
        elem.select();
        document.execCommand('copy');
        document.body.removeChild(elem);
        this.showPopupMessageForCopy(rows ? rows.length : 0);
    }

    async exportExcel(cols: any[], rows: any[], fileName: string, workSheetTitle?: string, isInherited: boolean = false, issueDeepScanning: boolean = true) {
        const workBook = new Excel.Workbook();
        const workSheet = workBook.addWorksheet('Sheet 1');
        let data: any[] = this.getTableDataForExcel(cols, rows);
        let headerValue: any[] = [];

        cols.forEach((col) => {
            headerValue.push(col.header);
        });

        //Add row for table title
        const titleRow = workSheet.addRow([workSheetTitle]);
        workSheet.addRow();

        titleRow.eachCell((cell) => {
            cell.font = {
                bold: true,
                size: 13
            }
        });

        if (isInherited && issueDeepScanning) {
            const noteFixVersion = workSheet.addRow([Constants.NOTE_FIX_VERSION]);
            noteFixVersion.eachCell((cell, number) => {
                cell.font = {
                    size: 10
                }
            });
            workSheet.addRow();
        }


        const headerRow = workSheet.addRow(headerValue);

        headerRow.eachCell((cell, number) => {
            cell.font = {
                bold: true,
                size: 11
            }
        });

        data.forEach(d => {
            d = this.excelDataArrayIntoString(d);
            const row = workSheet.addRow(d);
        });

        this.setWidthOfExcelColumns(workSheet);
        this.showPopupMessageForExporting(rows ? rows.length : 0);
        await this.saveAsExcelFile(workBook, fileName);
    }

    exportCsv(data: any[], fileName: string) {
        const replacer = (key, value) => value === null ? '' : value // specify how you want to handle null values here
        const header = Object.keys(data[0]);

        const csv =
            [
                header.join(','), // header row first
                ...data.map(row => header.map(fieldName => JSON.stringify(row[fieldName], replacer)).join(','))
            ].join('\r\n');

        this.showPopupMessageForExporting(data ? data.length : 0);
        this.saveAsCsvFile(csv, fileName);
    }

    private getTableDataForCopy(cols: any[], rows: any[]) {
        let tableData: any[] = [];
        if (cols && cols.length > 0 && rows && rows.length > 0) {
            for (let i = 0; i < rows.length; i++) {
                let row: any = {};
                for (let f = 0; f < cols.length; f++) {
                    row[cols[f].header] = this.expandNestedPropRec(rows[i], cols[f].field);
                }
                tableData.push(row);
            }
        }
        else if (cols && cols.length > 0) {
            let header: any = {};
            cols.forEach((col) => {
                header[col.header] = "";
            });
            tableData.push(header);
        }
        return tableData;
    }

    private getTableDataForExcel(cols: any[], rows: any[]) {
        let tableData: any[] = [];
        if (cols && cols.length > 0 && rows && rows.length > 0) {
            for (let i = 0; i < rows.length; i++) {
                let row: any[] = [];
                for (let f = 0; f < cols.length; f++) {
                    row[f] = this.expandNestedPropRec(rows[i], cols[f].field);
                }
                tableData.push(row);
            }
        }
        return tableData;
    }

    private excelDataArrayIntoString(data: any) {
        data.forEach(function (element, index) {
            if (Array.isArray(element)) {
                data[index] = element.join(" / ");
            }
        });
        return data;
    }

    private setWidthOfExcelColumns(worksheet: any) {
        //Auto Size width of Columns
        worksheet.columns.forEach(function (column, i) {
            var maxLength = 0;
            column["eachCell"]({ includeEmpty: true }, function (cell) {
                var columnLength = cell.value ? cell.value.toString().length : 10;
                if (columnLength > maxLength) {
                    maxLength = columnLength;
                }
            });
            column.width = maxLength < 10 ? 10 : maxLength;
        });
    }

    saveAsFile(data: any, mimeType: string, extension: string, fileName: string) {
        let blob = new Blob([data], { type: mimeType });
        saveAs(blob, `${fileName}.${extension}`);
    }

    saveAsCsvFile(csv: any, fileName: string) {
        this.saveAsFile(csv, 'text/csv;charset=utf-8', 'csv', fileName);
    }

    async saveAsExcelFile(workBook: any, fileName: string) {
        const buf = await workBook.xlsx.writeBuffer();
        this.saveAsFile(buf, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'xlsx', fileName);
    }

    private convertArraysToString(tableData) {
        tableData.map(data => {
            for (let rowData in data) {
                if (Array.isArray(data[rowData])) {
                    data[rowData] = data[rowData].toString();
                }
            }
        });
        return tableData;
    }

    private expandNestedPropRec(obj, prop) {
        if (typeof obj === 'undefined' || obj == null || prop == null) {
            return false;
        }
        var _index = prop.indexOf('.')
        if (_index > -1) {
            return this.expandNestedPropRec(obj[prop.substring(0, _index)], prop.substr(_index + 1));
        }

        return obj[prop];
    }

    private showPopupMessageForCopy(rows) {
        this.messageService.clear();
        this.messageService.add({
            key: 'message',
            severity: 'success',
            summary: 'Success!',
            detail: `${rows} row${rows !== 1 ? 's' : ''} ${rows !== 1 ? 'have' : 'has'} been copied to the clipboard.`,
            life: Constants.DATATABLE_POPUP_INTERVAL_TIME
        });
    }

    private showPopupMessageForExporting(rows) {
        this.messageService.clear();
        this.messageService.add({
            severity: 'success',
            key: 'message',
            summary: 'Success!',
            detail: `${rows} row${rows !== 1 ? 's' : ''} ${rows !== 1 ? 'have' : 'has'} been exported.`, 
        });
    }
}
