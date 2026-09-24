/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { Constants } from 'app/constants';
export class PrimeNgTableScroller {
  highlighted_Row_Id = 'scroller-highlighted-row';

  scrollToTable(tableId: string, tabId?: string, givenTabId: boolean = true, offset: number = 0, detailsTableTabId = "") {
    return new Promise<void>((res, rej) => {
      let self = this;
      setTimeout(async () => {
        if (tabId != null) {
          if (givenTabId) {
            await self.navigateToTab(tabId);
            if (detailsTableTabId) {
              const element = document.getElementById(`${detailsTableTabId}-details-link`);
              element.click()
            }
            await self.navigateToPanel(tableId);
            await this.clearSearch(tableId);
          }

        }
        setTimeout(() => {
          if ($('#' + tableId)) {
            var eTop = $('#' + tableId)?.offset()?.top;
            if (eTop) {
              window.scroll({ top: eTop - offset, behavior: 'smooth' });
            }
            else {
              this.scrollToTabPanel(tableId)
            }
            res();
          }
          else {
            rej(`table not found for id ${tableId}`);
          }
        }, 500);
      }, 5);
    });
  }

  async highlightRow(tableId: string, tabId: string, column: number, search: string, typeColumn = 0, showAllRows = false) {
    await this.scrollToTable(tableId, tabId);
    this.changePaginationDropdown(tableId);
    await this.wait(500);
    await this.searchAndSelectRows(tableId, column, search, typeColumn);
    await this.wait(500);
  }


  /***
   * Method to change pagination dropdown to All before scrolling
   */
  changePaginationDropdown(tableId: string) {
    if (document.querySelector(`#${tableId} .p-dropdown-label`)) {
      const dropDownLabel = document.querySelector(`#${tableId} .p-dropdown-label`).textContent;
      if (dropDownLabel.split(" ").join("") !== 'All') {
        document.querySelector<HTMLElement>(`#${tableId} .p-dropdown-label`).click();
        document.querySelector<HTMLElement>(`#${tableId} p-dropdown .p-dropdown p-dropdownitem:last-child li`).click();
      }
    }
  }

  async clearSearch(tableId: string) {
    const txtSearch = document.querySelector<HTMLInputElement>(`#${tableId} .search-input`);
    if (txtSearch && txtSearch.value) {
      txtSearch.value = '';
      await this.wait(100);
      txtSearch.dispatchEvent(new Event('input'));
      await this.wait(100);
    }
  }

  async searchAndSelectRows(tableId: string, column: number, search: string, typeColumn: number) {
    let found = false;
    const table = document.querySelector<HTMLTableElement>(`#${tableId} .p-datatable-scrollable table`) || document.querySelector<HTMLTableElement>(`#${tableId} table`);
    if (table) {
      const rows = Array.from(table.rows);
      let count = 0;

      if (tableId === Constants.EPIC_ANALYSIS_TABLE_ID) {
        this.enableEpicRow(rows, typeColumn);
      }

      var tableHeight = parseInt(Constants.DATATABLE_HEIGHT.replace(/\D/g, ''));

      if (rows) {
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const text = row?.cells[column]?.textContent;
          row.removeAttribute("id");

          if (text.toLowerCase() == search.toLowerCase()) {
            if (row.classList.contains(Constants.EPIC_ROW)) {
              row.classList.remove(Constants.EPIC_ROW);
            }

            found = true;
            row.setAttribute("id", this.highlighted_Row_Id);
            if (count == 0) {
              var rowHeight = (<HTMLElement>row).getBoundingClientRect().height * (i + 1) + 350;
              this.scrollScroller(rowHeight, tableHeight, tableId);
            }

            count++;
          };
        }
      }
    }

    return found;
  }
  /***
   * Method to scroll to selected start date and end date data
   */
  async searchAndSelectVelocityRows(tableId: string, startDateIndex: number, endDateIndex: number, startDate: string, endDate: string) {
    let found = false;
    const table = document.querySelector<HTMLTableElement>(`#${tableId} .p-datatable-scrollable table`) || document.querySelector<HTMLTableElement>(`#${tableId} table`);
    if (table) {
      const rows = Array.from(table.rows);
      let count = 0;
      var tableHeight = parseInt(Constants.DATATABLE_HEIGHT.replace(/\D/g, ''));
      if (rows) {
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const startDateText = row?.cells[startDateIndex + 1]?.textContent;
          const endDateText = row?.cells[endDateIndex + 1]?.textContent;
          row.removeAttribute("id");
          if (startDateText == startDate && endDateText == endDate) {
            found = true;
            row.setAttribute("id", this.highlighted_Row_Id);
            if (count == 0) {
              var rowHeight = (<HTMLElement>row).getBoundingClientRect().height * (i + 1) + 350;
              this.scrollScroller(rowHeight, tableHeight, tableId);
            }
            count++;
          };
        }
      }
    }
    return found;
  }

  enableEpicRow(rowsData, column) {
    for (let i = 0; i < rowsData.length; i++) {
      const row = rowsData[i];
      const text = row.cells[column].textContent;

      if (text === Constants.ISSUE_TYPE_EPIC) {
        row.classList.add(Constants.EPIC_ROW)
      }
    }
  }

  wait(ms: number) {
    return new Promise<void>((res, rej) => {
      setTimeout(() => {
        res();
      }, ms);
    });
  }

  async navigateToTab(tabId: string) {
    const $tab = $(`#${tabId}`);

    if ($tab.length && !$tab.parent().hasClass('active')) {
      window.scrollTo(0, 0);
      $tab.trigger('click');
      await this.wait(500);
    }
  }

  async navigateToPanel(tableId: string) {
    await this.wait(200);
    const panel = document.querySelector<HTMLElement>(`#${tableId}`)?.closest('accordion-panel');

    if (panel && !panel.classList.contains('panel-open')) {
      panel.querySelector<HTMLElement>('.accordion-toggle').click();
      await this.wait(500);
    }
  }

  scrollToTabPanel(tableId: string) {
    const panel = document.querySelector<HTMLElement>(`#${tableId}`)?.closest('accordion-panel');
    if (!panel) {
      window.scroll({ top: document.body.scrollHeight, behavior: 'smooth' });
    }
    panel?.scrollIntoView({ behavior: 'smooth' });
  }

  scrollScroller(rowHeight: number, tableHeight: number, tableId: string) {
    var eTop = $('#' + tableId).offset().top;
    rowHeight -= tableHeight;
    const scrollerTop = eTop + rowHeight;
    window.scroll({ top: scrollerTop, behavior: "smooth" });
    var scroller = document.querySelector(`#${tableId} .p-datatable-wrapper`);
    scroller.scroll({ top: rowHeight, behavior: "smooth" })
  }
}
