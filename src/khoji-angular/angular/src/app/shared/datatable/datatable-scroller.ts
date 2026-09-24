/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

export type DatatableSortOrder = [number, 'asc' | 'desc'];
export class DatatableScroller {
  cssHighlight = 'background-highlight';
  cssResetBackground = 'background-plain';
  private table: DataTables.Api;

  constructor(public tabId: string, public tableId: string, public selector: string = '#', public showAllRecords = false) {
    this.selector = selector + this.tableId;
  }

  sortBy(order: DatatableSortOrder[]) {
    if (!this.table) return;
    this.table.order(...order)
  }

  switchTab() {
    const $tab = $(`#${this.tabId}`);

    if ($tab.length && !$tab.parent().hasClass('active')) {
      window.scrollTo(0, 0);
      $tab.trigger('click');
      // TODO: remove after full refactoring
      // window.dispatchEvent(new Event('resize'));
    }

    return new Promise<void>(resolve => {
      setTimeout(() => {
        if (!$.fn.dataTable.isDataTable(this.selector)) {
          console.error(`datatable for selector '${this.selector}' not found.`);
        }

        this.table = $(this.selector).DataTable();

        if (this.showAllRecords) {
          this.table.page.len(-1).search('').draw(false);
        }
        else {
          this.table.search('').draw(false);
        }
        
        resolve();
      }, 2000);
    });
  }

  scrollTo(issueId: string, columnIndex: number) {
    if (!this.table) return;

    // open accordion panel if closed
    (<HTMLLIElement>document.querySelector(this.selector)?.closest('.panel')?.querySelector('.fa-chevron-down'))?.click();

    let idx = -1, index = -1;

    const row = this.table.row((i, data) => {
      idx++;
      const $dataNode = $(data[columnIndex]);
      const found = this.issueExists($dataNode, issueId);

      if (found) index = idx;

      return found;
    });

    if (row.length == 0) {
      console.error(`row not found for issue '${issueId}'. a row should exist as <tr><td><... class="issue-id ${issueId}">...</...></td></tr> in table '${this.selector}${this.tableId}'.`);
      return;
    }

    const pageInfo = this.table.page.info();
    const page = Math.ceil((index + 1) / this.table.page.len()) - 1;

    if (index < pageInfo.start || index > pageInfo.end - 1) {
      this.table.page(page).draw(false);
    }

    setTimeout(_ => {
      const headerHeight = 200; /* FIXED HEADER HEIGHT HERE */
      const topOfElement = window.pageYOffset + (<HTMLElement>row.node()).getBoundingClientRect().top - headerHeight;
      window.scroll({ top: topOfElement, behavior: "smooth" });
    }, 500);
  }

  highlightRows(issueId: string, columnIndex: number, highlightBackground = true) {
    if (!this.table) return;
    this.table.rows().every((index) => {
      const row = this.table.row(index);
      const $dataNode = $(row.data()[columnIndex]);
      const $domNode = $(row.node());
      // 1. remove hightlight from all rows
      $domNode.removeClass(this.cssHighlight);

      if (highlightBackground) {
        // 2. reset background for all rows
        $domNode.addClass(this.cssResetBackground);
      }

      if (this.issueExists($dataNode, issueId)) {
        // 3. add hightlight to selected row
        $domNode.addClass(this.cssHighlight);
      }
    });
  }

  private issueExists($dataNode: JQuery<any>, issueId: string) {
    // TODO: remove story-id check after full refactoring
    return ($dataNode.hasClass('issue-id') || $dataNode.hasClass('story-id')) && $dataNode.hasClass(issueId);
  }
}
