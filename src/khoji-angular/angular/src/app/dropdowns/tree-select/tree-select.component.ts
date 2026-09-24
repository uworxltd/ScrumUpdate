import { Component, ElementRef, EventEmitter, HostListener, Input, Output, ViewChild } from "@angular/core";
import { ITreeNode } from "app/shared/helper-functions";

@Component({
  selector: 'khoji-tree-select',
  templateUrl: './tree-select.component.html',
  styleUrls: ['./tree-select.component.scss']
})
export class TreeSelectComponent {
  @ViewChild('dropdown') dropdown: ElementRef<HTMLDivElement>;
  emitted: string[] = [];
  #items: TreeItem[] = [];
  #selected: string[] = [];
  open = false;

  @Input() cssClass = '';
  @Input() get items() {
    return this.#items;
  }
  set items(value: TreeItem[]) {
    this.#items = value.map(item => ({ ...item, children: this.setParent(item.children, item) }));
  }

  @Input() get selected() {
    return this.#selected;
  }
  set selected(value: string[]) {
    this.#selected = value;
    this.emitted = Array.from(value);
  }

  @Input() disabled = false;
  @Input() maxLabelChips = 2;
  @Output() selectedChange = new EventEmitter<string[]>();

  @HostListener('document:click', ['$event'])
  updateValue(event: { target: Node; }): void {
    if (!this.dropdown.nativeElement.contains(event.target)) {
      this.close();
    }
  }

  getSelectedItems(){
    return this.#items.filter(item=>this.hasSelection(item));
  }

  close() {
    this.open = false;
    this.reset();
  }

  reset() {
    if (this.hasChanged()) {
      this.selected = Array.from(this.emitted);
    }
  }

  onSelect(item: TreeItem) {
    const index = this.getIndex(item);

    if (index > -1) {
      this.selected.splice(index, 1);
      this.unSelectChildren(item);
      this.unSelectParent(item);
    }
    else {
      this.selected.push(item.value);
      this.selectChildren(item);
      this.selectParent(item);
    }
  }

  emitSelectedItems() {
    this.selectedChange.emit(this.selected);
    this.emitted = this.selected;
    this.close();
  }

  hasChanged() {
    const curr = this.selected;
    const prev = this.emitted;
    if (curr.length != prev.length) return true;
    const filtered = curr.filter(c => prev.includes(c));
    return filtered.length !== prev.length;
  }

  setParent(children: TreeItem[], parent: TreeItem) {
    return children.map(child => ({
      ...child,
      children: this.setParent(child.children, child),
      parent: parent
    }));
  }

  getIndex(item: TreeItem) {
    return this.selected.findIndex(s => s === item.value);
  }

  isSelected(item: TreeItem) {
    return this.getIndex(item) > -1;
  }

  areSelected(items: TreeItem[]) {
    return items.filter(t => this.isSelected(t)).length === items.length;
  }

  hasSelection(item: TreeItem): boolean {
    if (this.isSelected(item)) return true;
    return item.children.map(c => this.hasSelection(c)).filter(res => res).length > 0;
  }

  isIndeterminate(item: TreeItem) {
    return !this.isSelected(item) && this.hasSelection(item);
  }

  selectParent(item: TreeItem) {
    const { parent } = item;

    if (parent && this.areSelected(parent.children) && this.getIndex(parent) === -1) {
      this.selected.push(parent.value);
      this.selectParent(parent);
    }
  }

  unSelectParent(item: TreeItem) {
    const { parent } = item;
    if (!parent) return;
    const index = this.getIndex(parent);

    if (index > -1) {
      this.selected.splice(index, 1);
      this.unSelectParent(parent);
    }
  }

  selectChildren(item: TreeItem) {
    item.children.forEach(child => {
      if (this.getIndex(child) === -1) {
        this.selected.push(child.value);
        this.selectChildren(child);
      }
    });
  }

  unSelectChildren(item: TreeItem) {
    item.children.forEach(child => {
      const index = this.getIndex(child);

      if (index > -1) {
        this.selected.splice(index, 1);
        this.unSelectChildren(child);
      }
    });
  }
}

export interface TreeItem extends ITreeNode<TreeItem> {
  label: string;
  value: string;
  count: number;
  parent?: TreeItem;
}