import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TabulatorTableActionService } from 'app/services/tabulator-table-action.service';
import { SprintAnalyticsTableActions, TrackingService } from 'app/services/tracking';
import { deepClone, findElement, getLightBackgroundFromTextColor } from 'app/shared/helper-functions';
import jsPDF from 'jspdf';
import { applyPlugin } from 'jspdf-autotable';
import { ButtonModule } from 'primeng/button';
import { ChipModule } from 'primeng/chip';
import { MenuModule } from 'primeng/menu';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { SplitButtonModule } from 'primeng/splitbutton';
import { Subscription } from 'rxjs';
import { Formatter, Options, TabulatorFull as Tabulator, FormatModule, ColumnDefinition, CellComponent, EmptyCallback, Filter, GroupArg } from 'tabulator-tables';
import { v4 as uuidv4 } from 'uuid';
import * as XLSX from 'xlsx';

applyPlugin(jsPDF)

interface ColumnOption { title: string; field: string; visible: boolean; }

interface FormatterParams {
  [key: string]: string;
}
interface CustomFormatter {
  formatter: Formatter;
  formatterParams?: FormatterParams;
}

interface FormatterMap {
  [key: string]: (cell: CellComponent, params: FormatterParams, onRender: EmptyCallback) => string | HTMLElement;
}

interface CustomColumnDefinition extends ColumnDefinition {
  formatters: CustomFormatter[];
}

enum formatterClasses {
  listFormatter = 'list-formatter',
  chipFormatter = 'chip-formatter',
  iconFormatter = 'icon-formatter',
  initialsFormatter = 'initials-formatter',
  trailFormatter = 'trail-formatter',
}

@Component({
  selector: 'khoji-tabulator-table',
  standalone: true,
  templateUrl: './tabulator-table.component.html',
  styleUrl: './tabulator-table.component.scss',
  imports: [
    CommonModule,
    ButtonModule,
    SplitButtonModule,
    FormsModule,
    MenuModule,
    ChipModule,
    OverlayPanelModule,
  ],
})
export class TabulatorTableComponent implements OnInit, OnDestroy {
  subscription: Subscription;
  tableId = 'table-' + uuidv4().split('-')[4];
  tabulator: Tabulator;
  tableReady = false;
  expandTable = false;
  collapseTable = true;
  headerFilters = false;
  trailRegex = new RegExp(/^(\d{4}-\d{2}-\d{2})\s+(.+?)\s+→\s+(.+?)(?:\s+\((\d+[dhm])\))?$/);

  searchTerm: string = '';

  defaultOptions: Options = {
    height: '315px',
    layout: 'fitData',
    renderHorizontal: 'virtual',
    groupStartOpen: false,
    resizableColumnFit: true,
    movableColumns: true,
    groupHeader: (value, count, data, group) => {
      value = this.options.columns.find(c => c.field === group.getField())?.title + ' : ' + (value === null ? 'Not set' : value);
      return value + `<span>(${count})</span>`;
    },
    pagination: true,
    paginationSize: 10,
    paginationSizeSelector: [10, 25, 50, 100, true],
    paginationCounter: "pages",
    selectableRows: false,
    downloadConfig: {
      // columnHeaders:false, //do not include column headers in downloaded table
      // columnGroups:false, //do not include column groups in column headers for downloaded table
      // rowHeaders:false, //do not include row headers in downloaded table
      // rowGroups:false, //do not include row groups in downloaded table
      // columnCalcs:false, //do not include column calcs in downloaded table
      dataTree: true, //do not include data tree in downloaded table
    },
    //@ts-ignore
    dependencies: {
      jspdf: jsPDF,
      XLSX: XLSX,
    },
  };

  exportOptions = [
    // { label: 'CSV', icon: 'pi pi-file', command: () => this.export('csv') },
    // { label: 'Excel', icon: 'pi pi-file-excel', command: () => this.export('xlsx') },
    // { label: 'JSON', icon: 'pi pi-database', command: () => this.export('json') },
    // { label: 'PDF', icon: 'pi pi-file-pdf', command: () => this.export('pdf') },
    { label: 'HTML', icon: 'pi pi-code', command: () => this.export('html') },
  ];

  columnOptions: ColumnOption[] = [];
  defaultFormatters: FormatterMap = FormatModule['formatters'];
  filters: Filter[] = [];
  groupBy: string;

  formatters: FormatterMap = {
    'list': (cell, params: any, onRender) => {
      const list = cell['value']?.split(params.delimiter)?.map(value => `<li>${value}</li>`)?.join('');
      return `<ul class="${formatterClasses.listFormatter} list-unstyled">${list}</ul>`;
    },
    'icon': (cell, params: any, onRender) => {
      const icon = params?.icon
        || params?.iconMap && params?.mapField && params.iconMap[cell.getData()[params.mapField]]
        || params?.iconMap && params.iconMap[cell.getData()[cell.getValue()]];

      if (!icon) return cell['value'];

      const right = params?.position && params.position === 'right' ? `&nbsp;${icon}` : '';
      const left = right ? '' : `${icon}&nbsp;`;

      return `<span class="${formatterClasses.iconFormatter}">${left}${cell['value']}${right}</span>`;
    },
    'initials': (cell, params: any, onRender) => {
      const [firstName, secondName] = cell['value'].split(' ');
      const initials = (firstName?.substring(0, 1) + (secondName ? secondName?.substring(0, 1) : '')).trim();

      return `<span class="${formatterClasses.initialsFormatter} p-badge p-badge-dot p-badge-secondary">${initials}</span>${cell['value']}`;
    },
    'trail': (cell, params: any, onRender) => {
      onRender(() => {
        const element = cell.getElement();

        const addClass = (el: HTMLElement) => {
          const value = el.innerText.trim();
          const match = value.match(this.trailRegex);

          if (match) {
            const [, date, name, status, duration] = match;

            el.innerHTML = `
              <div class="flex align-items-center gap-2">
                <div class="date">${date}</div>
                <div class="p-chip">${name}</div>
                <div>&#x2192;</div>
                <div class="p-chip">${status}</div>
                ${duration ? `<div>(${duration})</div>` : ''}
              </div>`;
          }
        };

        if (cell['value'].match(new RegExp(formatterClasses.listFormatter))) {
          element.querySelectorAll(`.${formatterClasses.listFormatter} li`).forEach(addClass);
        }
        else {
          addClass(element.querySelector(`.${formatterClasses.chipFormatter}`));
        }
      });

      return `<span class="${formatterClasses.trailFormatter} inline-flex align-items-center">${cell['value']}</span>`;
    },
    'chip': (cell, params: any, onRender) => {
      onRender(() => {
        const element = cell.getElement();

        const addClass = (el: HTMLElement) => {
          el.classList.add('p-chip', 'mb-1');

          if (params?.styleClass) {
            el.classList.add(params.styleClass);
          }

          if (params?.colorMap) {
            const color = params.colorMap[el.innerText];

            if (color) {
              el.style.color = color;
              el.style.backgroundColor = getLightBackgroundFromTextColor(color, 60);
            }
          }
        };

        if (cell['value'].match(new RegExp(formatterClasses.listFormatter))) {
          element.querySelectorAll(`.${formatterClasses.listFormatter} li`).forEach(addClass);
        }
        else {
          addClass(element.querySelector(`.${formatterClasses.chipFormatter}`));
        }
      });

      return `<span class="${formatterClasses.chipFormatter} inline-flex align-items-center">${cell['value']}</span>`;
    },
  };

  _options: Options;

  @Input()
  get options() {
    return this._options;
  }
  set options(value: Options) {
    if (value) {
      this._options = {
        ...this.defaultOptions,
        ...value,
      };

      this.initTableAsync();
    }
  }

  @Input() exportFileTitle = 'scrumupdate';
  @Input() exportFileName = 'scrumupdate';
  @Input() tableNav = '';

  constructor(
    private actionService: TabulatorTableActionService,
    private trackingService: TrackingService,
  ) { }

  ngOnInit() { }

  async initTableAsync() {
    this.destroyTable();
    this.columnOptions = [];
    const element = await findElement<HTMLDivElement>(`#${this.tableId}`);
    
    const options: Options = {
      ...this.options,
      columns: this.options.columns.map((col: CustomColumnDefinition) => {
        const _col = deepClone(col);
        this.columnOptions.push({ title: col.title, field: col.field, visible: col.visible === undefined || col.visible === true });

        if (_col.tooltip && typeof _col.tooltip === 'string') {
          const _tooltip = _col.tooltip;
          _col.tooltip = (event, cell, onRender) => {
            return _tooltip;
          };
        }

        delete _col.formatters;
        _col.formatter = col.formatters?.length ? (cell, params, onRender) => {
          return col.formatters.reduce((value, cusFormatter) => {
            const cellValue = value instanceof HTMLElement ? value.outerHTML : value?.trim();

            if (cellValue === '' || cellValue === undefined || cellValue === null) {
              return '';
            }

            cell['value'] = cellValue;

            let _formatter = this.formatters[cusFormatter.formatter as string];

            if (_formatter) {
              return _formatter(cell, cusFormatter.formatterParams, onRender);
            }

            _formatter = this.defaultFormatters[cusFormatter.formatter as string];

            if (_formatter) {
              return _formatter.call(cell.getTable()['modules']['format'], cell, cusFormatter.formatterParams, onRender);
            }

            console.warn("Formatter Error - No such formatter found: ", cusFormatter.formatter);
            return value;

          }, cell.getValue())
        } : undefined;

        return _col;
      }),
    };

    // don't allow user to toggle first column as row expander is attached to it.
    this.columnOptions.shift();

    this.tabulator = new Tabulator(element, options);

    this.tabulator.on('tableBuilt', () => {
      this.tableReady = true;
    });

    this.tabulator.on("dataTreeRowExpanded", (row, level) => {
      this.tabulator.redraw(true);
    });

    const action$ = this.actionService.onAction$(this.tableId);

    this.subscription = new Subscription();

    this.subscription.add(action$.subscribe(action => {
      if (action.type === 'filter') {
        const filters = this.tabulator.getFilters(false);

        // Check if this is a clear filter action (empty array value)
        if (Array.isArray(action.value) && action.value.length === 0) {
          // Reset Sprint Items to default unfiltered/ungrouped state
          this.resetTableView();
        } else if (filters.findIndex(f => f.field === action.field && f.type === action.operator && f.value === action.value) === -1) {
          this.trackingService.captureUserAction(this.tableNav + ' / ' + SprintAnalyticsTableActions.Filter, { Field: action.field, Operator: action.operator, Value: action.value });

          // Clear existing filters and grouping before applying a new filter
          this.resetTableView();
          this.tabulator.addFilter(action.field, action.operator, action.value);
          this.filters = this.getFilters();

          // ensure table is expanded so the user sees the results
          this.collapseTable = false;
        }
      }
      else if (action.type === 'group') {
        // Empty field clears grouping; Tabulator requires false (not '') to ungroup
        if (!action.field) {
          this.resetTableView();
        } else {
          this.trackingService.captureUserAction(this.tableNav + ' / ' + SprintAnalyticsTableActions.GroupBy, { Term: this.searchTerm });

          // Clear existing filters before applying a new group
          this.clearProgrammaticFilters();
          this.tabulator.setGroupBy(action.field);
          this.groupBy = this.getGroupBy();

          // Ensure table is expanded so the user sees grouped results
          this.collapseTable = false;
        }
      }
      else if (action.type === 'expand') {
        // Explicit expand action from other components
        this.collapseTable = false;
      }
      else if (action.type === 'sort') {
        this.tabulator.setSort(action.field, action.sortDir);
      }
      else if (action.type == 'export') {
        let args: any[] = [action.exportType, this.exportFileName];

        if (action.exportType === 'xlsx') {
          args.push({ sheetName: this.exportFileTitle });
        }
        else if (action.exportType === 'pdf') {
          args.push({
            orientation: 'landscape', title: this.exportFileTitle,
          });
        }
        else if (action.exportType === 'html') {
          //args.push({ style: true });
          return this.downloadFormattedHtmlTable();
        }

        this.tabulator.download.apply(this.tabulator, args);
      }
    }));
  }

  toggleColumn(option: ColumnOption) {
    option.visible = !option.visible;
    this.tabulator.updateColumnDefinition(option.field, {
      title: option.title,
      visible: option.visible,
    });

    this.tabulator.redraw();
  }

  showFiltersUi() {
    const colDefs: ColumnDefinition[] = [];
    const isEnabling = !this.headerFilters;
    this.headerFilters = isEnabling;

    if (!isEnabling) {
      // Toggling the filter UI off resets the table to its unfiltered, ungrouped state.
      // Tabulator keeps header-filter values active even after the row is hidden,
      // so they must be explicitly cleared.
      this.tabulator.clearHeaderFilter();
      this.clearProgrammaticFilters();
      this.tabulator.setGroupBy(false as unknown as GroupArg);
      this.groupBy = undefined;

      // Notify other components (like sprint-summary-card) to clear their active filters
      this.actionService.triggerAction(this.tableId, {
        type: 'filter',
        field: '',
        value: []
      });
    }

    this.tabulator.getColumnDefinitions().forEach(col => {
      const values = this.options.data.filter(d => d[col.field])?.map(d => d[col.field]).sort();
      if (col.headerFilter as boolean !== false) {
        colDefs.push({
          ...col,
          visible: col.visible === undefined || col.visible === true,
          headerFilter: this.headerFilters ? "list" : undefined,
          headerFilterParams: this.headerFilters ? {
            values: [...new Set(values)],
            clearable: true,
          } : undefined
        });
      }
    });

    this.tabulator.setColumns(colDefs);
  }

  onSearch() {
    if (this.tabulator) {
      if (this.searchTerm && this.searchTerm.trim() !== '') {
        this.trackingService.captureUserAction(this.tableNav + ' / ' + SprintAnalyticsTableActions.Search, { Term: this.searchTerm });
        // Filter all columns for the search term
        const columns = this.tabulator.getColumns().map(col => col.getField()).filter(Boolean);
        this.tabulator.setFilter((rowData) => {
          return columns.some(field => {
            const value = rowData[field];
            return value && value.toString().toLowerCase().includes(this.searchTerm.toLowerCase());
          });
        });
      }
      else {
        const searchFilter = this.tabulator.getFilters(false)?.find(f => f.field as any instanceof Function);

        if (searchFilter) {
          this.tabulator.removeFilter(searchFilter.field, searchFilter.type, searchFilter.value);
        }
      }
    }
  }

  getGroupBy() {
    const [group] = this.tabulator?.getGroups();

    return group ? this.options.columns.find(c => c.field === group.getField())?.title : '';
  }

  /** Remove programmatic filters; preserve function-based search filters. */
  private clearProgrammaticFilters() {
    const filters = [...(this.tabulator.getFilters(false) || [])]
      .filter(f => !(f.field as any instanceof Function));

    filters.forEach(filter => {
      this.tabulator.removeFilter(filter.field, filter.type, filter.value);
    });
    this.filters = this.getFilters();
  }

  /** Restore Sprint Items to the default unfiltered, ungrouped view. */
  private resetTableView() {
    this.clearProgrammaticFilters();
    this.tabulator.setGroupBy(false as unknown as GroupArg);
    this.groupBy = undefined;
  }

  removeGroupBy() {
    this.tabulator.setGroupBy(false as unknown as GroupArg);
    this.groupBy = undefined;
    
    // Trigger a clear group action so other components (like sprint-summary-card) can react
    this.actionService.triggerAction(this.tableId, {
      type: 'group',
      field: '',
      value: undefined
    });
  }

  getFilters() {
    const filters = this.tabulator?.getFilters(false)?.filter(f => !(f.field as any instanceof Function));

    filters.forEach(f => {
      f['title'] = this.options.columns.find(c => c.field === f.field)?.title || f.field;
    });

    return filters;
  }

  removeFilter(filter: Filter) {
    this.tabulator.removeFilter(filter.field, filter.type, filter.value);
    this.filters = this.getFilters();
    
    // Trigger a clear filter action so other components (like sprint-summary-card) can react
    this.actionService.triggerAction(this.tableId, {
      type: 'filter',
      field: filter.field,
      operator: filter.type,
      value: []
    });
  }

  // Format filter value for display - limit to first 10 items
  formatFilterValue(value: any): string {
    if (!value) return '';
    
    const valueStr = value.toString();
    const items = valueStr.split(',');
    
    if (items.length > 3) {
      const firstTen = items.slice(0, 3).join(', ');
      const remaining = items.length - 3;
      return `${firstTen}... (+${remaining} more)`;
    }
    
    return items.join(', ');
  }

  export(type: string) {
    this.actionService.triggerAction(this.tableId, {
      type: 'export',
      exportType: <any>type,
    });
  }

  async onReset() {
    this.trackingService.captureUserAction(this.tableNav + ' / ' + SprintAnalyticsTableActions.Reset);

    this.searchTerm = '';
    await this.initTableAsync();
  }

  async toggleExpand() {
    this.expandTable = !this.expandTable;
  }

  toggleCollapse() {
    this.collapseTable = !this.collapseTable;
  }

  downloadFormattedHtmlTable() {
    this.trackingService.captureUserAction(this.tableNav + ' / ' + SprintAnalyticsTableActions.Download);

    const fileFormatter = (rows, options, setFileContents) => {
      //list - an array of export rows representing one row of data for the table;
      //options - the options object passed from the download function
      //setFileContents - function to call to pass the formatted data to the downloader

      var tRows = ``;

      //iterate over rows
      rows.forEach((row) => {
        var tData = '';

        switch (row.type) {
          case "header":
            //iterate over the columns in a row
            row.columns.forEach((col) => {
              if (col) {
                tData += `<th>${col.value}</th>`;
              }
            });

            tRows += `<tr>${tData}</tr>`;
            break;

          case "group":
            //handle group header rows
            break;

          case "calc":
            //handle calculation rows
            break;

          case "row":
            //iterate over the columns in a row
            row.columns.forEach((col) => {

              if (col) {
                let value = col.value;
                value = value === undefined || value === null ? '' : value;

                if (value && typeof value == 'string' && value.match('|')) {
                  value = value.split('|').join('<br />');
                }
                else if (value && typeof value == 'string' && value.match('||')) {
                  value = value.split('||').join('<br />');
                }

                tData += `<td>${value}</td>`;
              }
            });

            tRows += `<tr>${tData}</tr>`;
            break;
        }
      });

      //trigger file download, passing the formatted data and mime type
      setFileContents(`<style>table{width:max-content;border-collapse:collapse;}td,th{border:1px solid #e9e9e9;padding:5px}</style><h2 style="text-align:center;margin-bottom:10px">${this.exportFileTitle}</h2><table>${tRows}</table>`, "text/html");
    }

    this.tabulator.download(fileFormatter, `${this.exportFileName}.html`);
  }

  destroyTable() {
    this.tabulator?.destroy();
    this.subscription?.unsubscribe();
  }

  ngOnDestroy(): void {
    this.destroyTable();
  }
}
