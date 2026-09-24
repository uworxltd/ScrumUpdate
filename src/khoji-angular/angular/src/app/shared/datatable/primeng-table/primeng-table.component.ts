/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { isComponentEnabled, parseParametrizedString } from 'app/shared/helper-functions';
import { Component, Input, ViewChild } from "@angular/core";
import { Constants } from "app/constants";
import { AppState, GlobalConfigs } from 'app/states/app-states';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx'; // [v11] TODO: figure out a way to copy table data using ExcelJs then remove this
import { MessageService } from 'primeng/api';
import { getConcatenatedTeamBoards } from "app/shared/helper-functions";
import { Store } from '@ngrx/store';
import { filter, map } from 'rxjs/operators';
import { combineLatest, Subscription } from 'rxjs';
import { Table } from 'primeng/table';
import { selectTranslation } from 'app/states/global-translations.selector';
import * as _ from 'lodash';
import { ADMIN_TABLE_CONFIGS, DATATABLES_CONFIGS } from 'app/constants.configs';
import { AppFeature, getAppFeature } from 'app/app-features';
import * as actions from 'app/states/app.actions';
import { KhojiConfigs } from 'app/interface/khoji-config.interface';
import { Issues } from "app/datamodels/issues.datamodel";
import { KhojiComponent } from "app/interface/khoji-component.interface";
import { isBefore, parse } from 'date-fns';

const Excel = require('exceljs');

@Component({ template: `` })
export class PrimengTableComponent {

  constructor(protected store: Store<AppState>, protected messageService: MessageService) { }
  ragAndAlertsColumnHeading: string;
  cols: any[] = [];
  tableData: any[] = [];
  componentId: string;
  tableId: string;
  disableExportButton = false;
  selectedRows: any[] = [];
  visible = true;
  message: string;
  exportFileName: string;
  tableTitle: string;
  subscription = new Subscription();
  translation: any;
  tablesConfigs: any;
  adminTablesConfigs: any;
  emptyMessage: string;
  tableConfigsFound = false;
  showHideCols: any[];
  khojiConfigs: KhojiConfigs;
  selectedRowsText = '';
  totalRowsText = '';
  firstColumnWidth = '';
  enableShowHideButton: boolean;
  showHideButtonTitle = '';
  deleteButtonTitle = '';
  deleteButtonEnabledTitle = '';
  isReleaseComponent: boolean;
  ragStatusEnabled = false;
  errorsEnabled = false;
  warningsEnabled = false;
  tableCols: any[];
  ragStatusIndex: number;
  errorsIndex: number;
  warningsIndex: number;
  allIssuesHavingNoEstimate = false;
  includedCols: any[];
  selectionMode: string;
  tabConfigs: KhojiComponent[] = [];
  disableRefreshAndDeleteButton = true;
  componentLoading: boolean = false;

  @Input() enablePaging = true;
  @Input() enableSearch = true;
  @Input() enableSelection = true;
  @Input() enableExport = true;
  @Input() scroller = true;
  @Input() scrollDirection = Constants.BOTH_DIRECTION;
  @Input() tableHeight = Constants.DATATABLE_HEIGHT;
  @ViewChild('dt') table: Table;

  get columnsData() {
    return [];
  }

  init(configFilter: (globalConfig: GlobalConfigs) => boolean = (gc) => !!gc.serverConfigs[DATATABLES_CONFIGS] || !!gc.serverConfigs[ADMIN_TABLE_CONFIGS]) {

    if (!this.componentId) throw new Error('property componentId is required');
    if (!this.tableId) throw new Error('property tableId is required');
    const appFeature = getAppFeature();
    this.isReleaseComponent = appFeature === AppFeature.AnalysisByRelease || appFeature === AppFeature.ReleaseReport;
    this.selectionMode = this.enableSelection ? Constants.MULTIPLE_SELECTION_MODE : Constants.NONE_SELECTION_MODE;
    this.selectedRows = [];
    const translation$ = this.store.pipe(
      selectTranslation,
      map(data => {
        this.translation = data;
        this.emptyMessage = this.translation.error.noRecordsFoundMessage;
        this.deleteButtonTitle = this.translation.help.mainPage.buttons.deleteButtonDataTableTitle;
        this.deleteButtonEnabledTitle = this.translation.help.mainPage.buttons.deleteButtonEnabledTitle;
        return data;
      })
    );

    const khojiConfigs$ = this.store.select('globalConfigs').pipe(
      filter(gc => { return configFilter(gc) }),
      map(data => {
        if (data.serverConfigs[DATATABLES_CONFIGS]) {
          this.tablesConfigs = JSON.parse(JSON.stringify(data.serverConfigs[DATATABLES_CONFIGS]));
        }

        this.adminTablesConfigs = data.serverConfigs[ADMIN_TABLE_CONFIGS];
      }));
    return combineLatest([translation$, khojiConfigs$]);
  }

  customFilter(dt: any, eventValue: string, filterType: string) {
    this.handleExportButton(eventValue);
    dt.filterGlobal(eventValue, filterType);
  }

  tableConfigExist(tableName: string): boolean {
    return this.tablesConfigs.hasOwnProperty(tableName) && this.tablesConfigs[tableName].hasOwnProperty("columns")
      && this.tablesConfigs[tableName].columns.length > 0
  }

  //export button should be disabled on filtered view
  handleExportButton(eventValue: string) {
    if (eventValue == "") {
      this.disableExportButton = false;
    }
    else {
      this.disableExportButton = true;
    }
  }

  exportCopy(cols: any[], stories: any[], tableTitle?: string, isInherited: boolean = false, issueDeepScanning: boolean = true) {
    let data: any[] = this.getTableDataForCopy(cols, stories);
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
    this.showPopupMessageForCopy(stories ? stories.length : 0);
  }

  convertArraysToString(tableData) {
    tableData.map(data => {
      for (let rowData in data) {
        if (Array.isArray(data[rowData])) {
          data[rowData] = data[rowData].toString();
        }
      }
    });
    return tableData;
  }

  exportExcel(cols: any[], stories: any[], exportFileName: string, tableTitle?: string, isInherited: boolean = false, issueDeepScanning: boolean = true) {
    const workBook = new Excel.Workbook();
    const workSheet = workBook.addWorksheet('Sheet 1');
    let data: any[] = this.getTableDataForExcel(cols, stories);
    let headerValue: any[] = [];

    cols.forEach((col) => {
      headerValue.push(col.header);
    });

    //Add row for table title
    const titleRow = workSheet.addRow([tableTitle]);
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
    this.saveAsExcelFile(workBook, exportFileName, stories);
  }

  exportFixVersionMessage() {
    if (this.cols.findIndex(data => data.field == Constants.FIX_VERSION) >= 0) {
      return true;
    }
    else return false;
  }

  loading() {
    this.tableData = [];
    this.message = "Loading... ";
    this.componentLoading = true;
  }

  loadingError() {
    this.message = 'Error loading data';
    this.componentLoading = false;
  }

  excelDataArrayIntoString(data: any) {
    data.forEach(function (element, index) {
      if (Array.isArray(element)) {
        data[index] = element.join(" / ");
      }
    });
    return data;
  }

  getFixVersion(story) {
    let fixVersion = story?.fixVersions?.releases?.map(r => r.name).join(', ');
    return story.fixVersions?.inherited ? fixVersion + ' (i)' : fixVersion;
  }

  setWidthOfExcelColumns(worksheet: any) {
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

  getTableDataForExcel(cols: any[], stories: any[]) {
    let tableData: any[] = [];
    if (cols && cols.length > 0 && stories && stories.length > 0) {
      for (let i = 0; i < stories.length; i++) {
        let story: any[] = [];
        for (let f = 0; f < cols.length; f++) {
          story[f] = cols[f].field === 'aggregatedTeamBoardList' ?
            getConcatenatedTeamBoards(this.getProp(stories[i], cols[f].field)) :
            this.getProp(stories[i], cols[f].field);
        }
        tableData.push(story);
      }
    }
    return tableData;
  }

  customSort(event: any) {
    event.data.sort((data1, data2) => {
      //using lodash for nested values (e.g. indicatorsData.fieldLevel1.fieldLevel2)
      let value1 = _.get(data1, event.field.split("."));
      let value2 = _.get(data2, event.field.split("."));
      let result = null;

      if (value1 == null && value2 != null)
        result = -1;
      else if (value1 != null && value2 == null)
        result = 1;
      else if (value1 == null && value2 == null)
        result = 0;
      else if (typeof value1 === 'string' && typeof value2 === 'string') {
        result = value1.localeCompare(value2);

        //Custom Sort for date column
        if (event.field === "dateStarted" || event.field === "dateResolved" || event.field === "dateCreated" || event.field === "date" || event.field === "intervalStartDate" || event.field === "intervalEndDate" || event.field === "storyResolvedDate") {
          result = isBefore(parse(value1, Constants.PRIME_NG_DATE_FORMAT, new Date()), parse(value2, Constants.PRIME_NG_DATE_FORMAT, new Date())) ? -1 : 1;
        }

        //Custom Sort for Issue Id
        else if (event.field == "epicId" || event.field == "id" && result !== 0) {
          let issueIdA = value1.split("-");
          let issueIdB = value2.split("-");
          result = issueIdA[0] < issueIdB[0] || (issueIdA[0] === issueIdB[0] && Number(issueIdA[1]) < Number(issueIdB[1])) ? -1 : 1;
        }
      }

      else
        result = (value1 < value2) ? -1 : (value1 > value2) ? 1 : 0;

      return (event.order * result);
    });
  }

  getTableDataForCopy(cols: any[], stories: any[]) {
    let tableData: any[] = [];
    if (cols && cols.length > 0 && stories && stories.length > 0) {
      for (let i = 0; i < stories.length; i++) {
        let story: any = {};
        for (let f = 0; f < cols.length; f++) {
          story[cols[f].header] = cols[f].field === 'aggregatedTeamBoardList' ?
            getConcatenatedTeamBoards(this.getProp(stories[i], cols[f].field)) :
            this.getProp(stories[i], cols[f].field);
        }
        tableData.push(story);
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

  onSearch() {
    this.resetDisplayedStories();
  }


  // logic to capture displayed stories on current table page
  lastRowIndex = -1;
  displayedStories: any[] = [];

  resetDisplayedStories() {
    this.displayedStories = [];
    this.lastRowIndex = -1;
  }

  addToDisplayedStories(story: any, rowIndex: number) {
    if (this.lastRowIndex < rowIndex) {
      this.lastRowIndex = rowIndex;
      if (story.hasOwnProperty('teamBoard')) {
        story.teamBoard = getConcatenatedTeamBoards(story.aggregatedTeamBoardList);
      }
      this.displayedStories.push(story);
    }
  }

  calculateFooter(stories: any[], field: string, dataType: string, operationType: string = Constants.AVG) {
    let footerText = "";
    let columnSum = null;

    if (stories && stories.length > 0 && dataType == Constants.NUMERIC_DATATYPE) {
      let filteredStories = stories.map(story => this.getProp(story, field)).filter(data => data != null && !isNaN(data));
      if (filteredStories && filteredStories.length > 0) {
        columnSum = filteredStories.reduce((a, b) => a + b, 0);
      }
    }

    if (columnSum != null && !isNaN(columnSum) && operationType == Constants.AVG) {
      let val = columnSum / stories.length;
      footerText = val.toFixed(2);
    }
    else if (columnSum != null && !isNaN(columnSum) && operationType == Constants.TOTAL) {
      footerText = columnSum % 1 == 0 ? columnSum.toFixed(0) : columnSum.toFixed(2);
    }

    return footerText;
  }

  get fixVersionHeaderText() {
    const fixVersion = this.translation.team.deliveryAnalysis.table.columns.fixVersions;
    const inheritedFromParent = this.translation.team.epic.table.tooltip.inheritedFromParent;
    return this.khojiConfigs.inheritFixVersion ? fixVersion + " (i) " + inheritedFromParent : fixVersion;
  }

  getFormattedProperty(obj, prop) {
    let property = this.getProp(obj, prop);
    if (property && property != null && !isNaN(property) && !Array.isArray(property)) {
      property = property % 1 == 0 ? property.toFixed(0) : property.toFixed(2)
    }

    return property;
  }

  getProp(obj, prop) {
    if (typeof obj === 'undefined' || obj == null || prop == null) {
      return false;
    }
    var _index = prop.indexOf('.')
    if (_index > -1) {
      return this.getProp(obj[prop.substring(0, _index)], prop.substr(_index + 1));
    }

    return obj[prop];
  }

  findParentIds(issue: Issues, issues: Issues[]) {
    let parentIds = [];
    let parentURLs = [];
    parentIds = this.getParentIds(issue, issues, parentIds);
    parentURLs = this.getParentURLs(issue, issues, parentURLs);
    return [parentIds, parentURLs];
  }

  getParentIds(issue: Issues, issues: Issues[], parents: any) {
    const hasParent = issue?.parent && issue.parent != null;
    if (hasParent) {
      parents = this.getParentIds(issues.find(i => i.id == issue.parent), issues, parents);
      parents.push(issue.parent);
    }
    return parents;
  }

  getParentURLs(issue: Issues, issues: Issues[], parents: any) {
    const hasParent = issue?.parent && issue.parent != null;
    if (hasParent) {
      parents = this.getParentURLs(issues.find(i => i.id == issue.parent), issues, parents);
      parents.push({ parentURL: issue.parentURL, parentType: issue.parentType });
    }
    return parents;
  }

  saveAsExcelFile(workBook: any, fileName: string, rows: any[]): void {
    this.showPopupMessageForExporting(rows ? rows.length : 0);

    workBook.xlsx.writeBuffer().then((data) => {
      let blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, fileName + '.xlsx');
    })

  }

  deleteSelectedRows() {
    const idsToExclude: string[] = [];
    this.selectedRows.forEach((element) => {
      idsToExclude.push(element.id);
    });
    this.selectedRows = [];
  }

  refreshDeletedRows() {
    this.selectedRows = [];
    this.store.dispatch(actions.fetchConfigs({ propKeys: [DATATABLES_CONFIGS] }));
  }

  updateShowHideDropdownTitle() {
    const ele = document.querySelector<HTMLElement>(`#${this.tableId} ul.p-multiselect-items`);
    if (ele) {
      ele.title = '';
    }
  }

  sanitizeHtml(data: string) {
    if (isNaN(Number(data))) {
      const htmlSanitizer = /<[^>]*(>|$)|&nbsp;|&zwnj;|&raquo;|&laquo;|amp;|&gt;/g
      const reg = /<a(?=\s|>)(?!(?:[^>=]|=(['"])(?:(?!\1).)*\1)*?\shref=['"])[^>]*>.?(more|less)<\/a>/g
      data = data.replace(reg, '')
      return data.replace(htmlSanitizer, '');
    } else {
      return data;
    }
  }

  showPopupMessageForExporting(rows) {
    const dataTableMessages = this.translation?.toastMessages.dataTableMessages;
    this.messageService.clear();
    this.messageService.add({
      severity: 'success',
      key: 'message',
      summary: 'Success!',
      detail: rows > 1 ? parseParametrizedString(dataTableMessages.multipleRowsExportMessage, rows) :
        parseParametrizedString(dataTableMessages.singleRowExportMessage, rows),
      life: Constants.DATATABLE_POPUP_INTERVAL_TIME
    });
  }

  showPopupMessageForCopy(rows) {
    this.messageService.clear();
    this.messageService.add({
      key: 'message',
      severity: 'success',
      summary: 'Success!',
      detail: `${rows} row${rows !== 1 ? 's' : ''} ${rows !== 1 ? 'have' : 'has'} been copied to the clipboard.`,
      life: Constants.DATATABLE_POPUP_INTERVAL_TIME
    });
  }

  customExport(dt: any, rows: any[]) {
    dt.exportCSV({ selectionOnly: this.selectedRows.length > 0 });
    this.showPopupMessageForExporting(rows ? rows.length : 0);
  }

  checkPaginationText() {
    this.selectedRowsText = this.selectedRows.length > 0 ? this.selectedRows.length.toString() + " " + this.checkRowsCountText() + " selected" : ""
    this.totalRowsText = 'Showing 1 to ' + this.tableData.length + ' of ' + this.tableData.length + ' entries';
    if (document.querySelector(`#${this.tableId} p-dropdownitem:last-child > li > span`)) {
      document.querySelector(`#${this.tableId} p-dropdownitem:last-child > li > span`).innerHTML = "All"
    }

    if (document.querySelector(`#${this.tableId} p-dropdownitem:last-child > li`)) {
      document.querySelector(`#${this.tableId} p-dropdown .p-dropdown-label`).textContent = document.querySelector("#p-highlighted-option")?.textContent;
    }
    return `Showing {first} to {last} of {totalRecords} entries`;
  }

  setDropDownValueAsAll(value: string) {
    if (document.querySelector(`#${this.tableId} p-dropdown .p-dropdown-label`)?.textContent) {
      document.querySelector(`#${this.tableId} p-dropdown .p-dropdown-label`).textContent = value;
    }
  }

  setDropDownValue(value: any) {
    if (document.querySelector(`#${this.tableId} p-dropdown .p-dropdown-label`)?.textContent) {
      document.querySelector(`#${this.tableId} p-dropdown .p-dropdown-label`).textContent = value.toString();
    }
  }

  getDropDownValue() {
    if (document.querySelector(`#${this.tableId} p-dropdown .p-dropdown-label`)?.textContent) {
      return document.querySelector(`#${this.tableId} p-dropdown .p-dropdown-label`).textContent;
    }
    return null;
  }

  checkRowsCountText() {
    return this.selectedRows.length === 1 ? 'row' : 'rows';
  }

  setColumns(columns: any[]) {
    this.includedCols = columns.filter(c => c.include);
    this.cols = columns.filter(c => c.include && !c.enableShowHide).map(this.transformColumn.bind(this));
    this.showHideCols = columns.filter(c => c.include && c.enableShowHide).map(this.transformColumn.bind(this));
    this.enableShowHideButton = this.showHideCols.length == 0;
    this.showHideButtonTitle = this.showHideCols.length > 0 ? this.translation.help.mainPage.buttons.enableShowHideButtonDataTable
      : this.translation.help.mainPage.buttons.disableShowHideButtonDataTable;
    this.firstColumnWidth = this.cols[0] ? this.cols[0].width : 0;
  }

  checkWidth(column: any) {
    let width;
    if (column.hasOwnProperty('width')) {
      width = column.width.replace(/\D/g, '');
      width = parseInt(width);
    }
    return width > Constants.MIN_COLUMN_WIDTH ? column.width : Constants.AUTO_COLUMN_WIDTH;
  }

  transformColumn(col) {
    return ({ ...col, width: this.checkWidth(col), heading: col.field === Constants.RAG_AND_ALERTS && isComponentEnabled(this.tabConfigs, Constants.ALERTS_ANALYSIS) ? this.ragAndAlertsColumnHeading : col.header });
  }

  @Input() get selectedColumnsForShowHide(): any[] {
    return this.cols;
  }

  set selectedColumnsForShowHide(val: any[]) {
    //restore original ordercon
    this.message = val.length > 0 ? this.message : this.translation.viewUser.errors.noDataAvailable;
    this.cols = this.columnsData.filter(c => c.include && val.findIndex(v => v.field == c.field) > -1).map(this.transformColumn.bind(this));;
  }

  /**
* Wrap the data table cell (td) in span to add truncation class
* @param propertyName the name of property
*/
  checkIfCellNeedTruncateClassAttributeNeeded(columns: any[], field: string) {
    const col = columns.find(c => c.field == field && (c.dataType == 'date' || c.dataType == 'text'));
    return col ? "simpleCellTruncate" : null;
  }

  updateVisibility(): void {
    this.visible = false;
    setTimeout(() => this.visible = true, 0);
  }

  loadingDone(hasData: boolean) {
    this.message = hasData && this.cols.length > 0 && this.selectedColumnsForShowHide.length > 0 ? this.translation.success.almostDone : this.translation.viewUser.errors.noDataAvailable;
    this.componentLoading = false;
  }

  closeShowHideColsDropdown() {
    const drp = document.querySelector<HTMLElement>(`#${this.tableId} .p-multiselect`);

    if (drp && drp.classList.contains('p-multiselect-open')) {
      drp.click();
    }
  }

  trimExtraProps<T>(obj: T, props: { field: string }[]) {
    return {
      ...(props.reduce((tableData, column) => {
        tableData[column.field] = obj[column.field];
        return tableData;
      }, {}))
    };
  }

  newDataForRagAndAlerts() {
    this.ragStatusIndex = this.tableCols.findIndex(data => data.field === Constants.RAG_STATUS);
    this.errorsIndex = this.tableCols.findIndex(data => data.field === Constants.ALERTS_ERRORS);
    this.warningsIndex = this.tableCols.findIndex(data => data.field === Constants.ALERTS_WARNINGS);
    this.errorsEnabled = this.tableCols[this.errorsIndex].include;
    this.warningsEnabled = this.tableCols[this.warningsIndex].include;
    this.ragStatusEnabled = this.tableCols[this.ragStatusIndex].include;
    let ragAlertsColumn = this.configDataForRagAndAlerts();
    this.tableCols[this.ragStatusIndex].include = false;
    this.tableCols[this.errorsIndex].include = false;
    this.tableCols[this.warningsIndex].include = false;
    this.tableCols.splice(this.ragStatusIndex, 0, ragAlertsColumn);
  }

  private configDataForRagAndAlerts() {
    let data = { ...this.tableCols[this.ragStatusIndex] };
    data.header = this.ragAndAlertsHeader();
    data.field = Constants.RAG_AND_ALERTS;
    data.toolTip = this.ragAlertsTooltip();
    data.enableShowHide = this.tableCols[this.ragStatusIndex].enableShowHide || this.tableCols[this.errorsIndex].enableShowHide || this.tableCols[this.warningsIndex].enableShowHide;
    data.include = this.tableCols[this.ragStatusIndex].include || ((this.tableCols[this.errorsIndex].include || this.tableCols[this.warningsIndex].include) && isComponentEnabled(this.tabConfigs, Constants.ALERTS_ANALYSIS));
    return data;
  }

  private ragAndAlertsHeader() {
    let header = [];
    let ragAlertHeading = [];
    if (this.ragStatusEnabled) {
      ragAlertHeading.push(this.tableCols[this.ragStatusIndex].header);
      header.push(this.tableCols[this.ragStatusIndex].header);
    }

    if ((this.warningsEnabled || this.errorsEnabled) && isComponentEnabled(this.tabConfigs, Constants.ALERTS_ANALYSIS)) {
      ragAlertHeading.push(Constants.ALERTS_ISSUE);
    }

    if (this.errorsEnabled && isComponentEnabled(this.tabConfigs, Constants.ALERTS_ANALYSIS)) {
      header.push(this.tableCols[this.errorsIndex].header);
    }

    if (this.warningsEnabled && isComponentEnabled(this.tabConfigs, Constants.ALERTS_ANALYSIS)) {
      header.push(this.tableCols[this.warningsIndex].header);
    }

    this.ragAndAlertsColumnHeading = ragAlertHeading.join(" / ");
    return header.join(" / ");
  }

  private ragAlertsTooltip() {
    let toolTip = '';
    if (this.tableCols[this.ragStatusIndex].toolTip !== '') {
      toolTip += this.tableCols[this.ragStatusIndex].toolTip;
      toolTip += " ";
    }

    if (this.tableCols[this.errorsIndex].toolTip !== '' && isComponentEnabled(this.tabConfigs, Constants.ALERTS_ANALYSIS)) {
      toolTip += this.tableCols[this.errorsIndex].toolTip;
      toolTip += " ";
    }

    if (this.tableCols[this.warningsIndex].toolTip !== '' && isComponentEnabled(this.tabConfigs, Constants.ALERTS_ANALYSIS)) {
      toolTip += this.tableCols[this.warningsIndex].toolTip;
    }
    return toolTip;
  }

  prepareRagAndAlerts(ragStatus, alerts) {

    let data = [];
    if (this.ragStatusEnabled && ragStatus !== '' && !this.allIssuesHavingNoEstimate) {
      data.push(ragStatus);
    }
    if (this.errorsEnabled && isComponentEnabled(this.tabConfigs, Constants.ALERTS_ANALYSIS)) {
      data.push(alerts.errors);
    }
    if (this.warningsEnabled && isComponentEnabled(this.tabConfigs, Constants.ALERTS_ANALYSIS)) {
      data.push(alerts.warnings);
    }
    return data;
  }


  errorsTitle(status: string) {
    return status == Constants.RESOLVED_STATUS ? this.translation.team.deliveryAnalysis.table.tooltip.errorR : this.translation.team.deliveryAnalysis.table.tooltip.error;
  }

  warningTitle(status: string) {
    return status == Constants.RESOLVED_STATUS ? this.translation.team.deliveryAnalysis.table.tooltip.warningR : this.translation.team.deliveryAnalysis.table.tooltip.warning;
  }

  /**
   * Matches the column field with
   * field name and determines whether
   * display tool tip is to be displayed
   *
   * @param column of table
   * @param fieldName in config
   * @param displayTooltip to be displayed or not
   * @returns true if tool tip is to be displayed,
   * false otherwise
   */
  isFieldAndTooltipEnabled(column: any, fieldName: string, displayTooltip: boolean) {
    if (column.field == fieldName) {
      return displayTooltip;
    }
    return true;
  }

  /***
   * Method to show tooltip message on delete rows button
   */
  showDeleteButtonTooltip(disableRefreshAndDeleteButton: boolean) {
    return disableRefreshAndDeleteButton ? this.translation?.team?.alertAnalysis?.disableUntilComponentsLoad : this.selectedRows.length > 0 ? this.deleteButtonEnabledTitle : this.deleteButtonTitle;
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}

