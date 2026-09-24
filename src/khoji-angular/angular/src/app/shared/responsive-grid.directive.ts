import { AfterViewInit, Directive, DoCheck, ElementRef, HostListener, Input } from "@angular/core";

const MAX_INDICATOR_GRID_WIDTH = 1100;

@Directive({
  selector: '[khoji-responsive-grid]'
})
export class ResponsiveGridDirective implements AfterViewInit, DoCheck {
  @Input()
  filterCssClass = '';

  @Input()
  set testCount(count: number) {
    if (Number(count) > 0) {
      const [firstItem] = this.items;
      const { nativeElement: ele } = this.eleRef;

      while (ele.children.length > 0) ele.removeChild(ele.childNodes[0]);

      for (let i = 0; i < count; i++) {
        ele.appendChild(firstItem.cloneNode(true));
      }

      this.updateGrid();
    }
  }

  constructor(private eleRef: ElementRef<HTMLElement>) { }
  
  ngDoCheck(): void {
    this.reRender();
  }

  ngAfterViewInit(): void {
    this.reRender();
  }

  reRender(): void {
    const { style } = this.eleRef.nativeElement;
    style.display = 'grid';
    style.columnGap = '9px';
    this.updateGrid();
  }

  @HostListener('window:resize', ['$event.target'])
  onResize(btn) {
    this.updateGrid();
  }

  updateGrid() {
    // NOTE (mansab): all calculations are based on 4 column grid
    const columns = 4;
    const { items, eleRef } = this;
    const { length: count } = items;
    const { style } = eleRef.nativeElement;

    let grid = 'auto '.repeat(count > columns ? columns * 2 : count);

    if (count == 5) {
      grid = 'auto '.repeat(6);
      this.updateItems(items.splice(count - 2), 2);
    }
    else if (count == 6) {
      grid = 'auto '.repeat(6);
      this.updateItems(items.splice(count - 3), 1);
    }
    else if (count > columns) {
      const mod = count % columns;

      if (mod == 1) {
        this.updateItems(items.splice(count - 2), 3);
        this.updateItems(items.splice(count - 5), 2);
      }
      else if (mod == 2) {
        this.updateItems(items.splice(count - 2), 3);
      }
      else if (mod == 3) {
        this.updateItems(items.splice(count - 3), 2);
      }
    }

    this.updateItems(items, 1);
    style.gridTemplateColumns = this.mobileView ? 'auto' : grid;
  }

  get mobileView() {
    return document.documentElement.clientWidth < MAX_INDICATOR_GRID_WIDTH;
  }

  updateItems(items: HTMLElement[], startColumn: number) {
    for (let i = 0; i < items.length; i++) {
      const jump = 2 * (i % 4);
      items[i].style.gridColumn = this.mobileView ? '1/2' : `${jump + startColumn}/${jump + startColumn + 2}`;
    }
  }

  get items() {
    const items = <HTMLElement[]><unknown>Array.from(this.eleRef.nativeElement.children);

    if (this.filterCssClass) {
      return items.filter(ele => !ele.classList.contains(this.filterCssClass))
    }

    return items;
  }
}