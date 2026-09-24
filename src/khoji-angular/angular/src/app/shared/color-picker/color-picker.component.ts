/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { Component, ElementRef, EventEmitter, HostListener, Input, OnDestroy, OnInit, Output, ViewChild, ViewEncapsulation } from '@angular/core';
import { Store } from '@ngrx/store';
import { Constants } from 'app/constants';
import { AppState } from 'app/states/app-states';
import { selectTranslation } from 'app/states/global-translations.selector';
import { Subscription } from 'rxjs';

@Component({
  selector: 'khoji-color-picker',
  templateUrl: './color-picker.component.html',
  styleUrls: ['./color-picker.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class ColorPickerComponent implements OnInit, OnDestroy {
  @Input() title: string;
  @Input() hoverTitle: string;
  @Input() colorPalette: string[];
  @Input() selectedColor: string;
  @Input() radius = 20;
  @Input() disabledSaveButtonHint: string;

  @Output() selectedColorChange = new EventEmitter<string>();
  constants = Constants;
  isColorPickerOpen: boolean = false;
  defaultColor: string;
  isColorChanged: boolean = false;
  translation: any;
  subscription = new Subscription();
  static cssClassDropdown = 'color-picker-dropdown';
  cssClassDropdownHidden = 'hidden';
  cssClassDropdownOpenTop = 'open-top';
  cssHeightDropdown = 220;
  scrollListener: (ev: Event) => void;
  scrollTop = 0;

  get scrollParent() {
    const scrollParent = node => {
      if (node == null) return null;
      return node.scrollHeight > node.clientHeight ? node : scrollParent(node.parentNode);
    };

    return scrollParent(this.colorPicker.nativeElement)
  }

  @ViewChild('colorPicker') colorPicker: ElementRef<HTMLDivElement>;
  @ViewChild('colorPickerDropdown') colorPickerDropdown: ElementRef<HTMLDivElement>;

  constructor(private store: Store<AppState>) { }


  ngOnInit(): void {
    this.subscription.add(
      this.store.pipe(selectTranslation).subscribe((translation) => {
        this.translation = translation;
      })
    );
    this.defaultColor = this.selectedColor;
  }

  selectColor(color: string) {
    this.selectedColor = color;
    this.isColorChanged = true;
    this.save();
  }

  @HostListener('document:click', ['$event'])
  updateValue(event: { target: Node; }): void {
    if (!this.colorPicker.nativeElement.contains(event.target)) {
      this.close();
    }
  }

  toggle(ev: MouseEvent) {
    this.defaultColor = this.selectedColor;
    this.isColorPickerOpen = !this.isColorPickerOpen;

    if (!this.isColorPickerOpen) return;

    setTimeout(() => {
      this.placeElement(
        this.colorPickerDropdown.nativeElement,
        this.colorPicker.nativeElement,
        {
          height: this.cssHeightDropdown,
          topOffset: 5,
          leftOffset: 15,
          cssClassHidden: this.cssClassDropdownHidden,
          cssClassOpenTop: this.cssClassDropdownOpenTop
        }
      );
    }, 100);
  }

  placeElement(
    element: HTMLElement,
    target: HTMLElement,
    options: {
      height: number,
      topOffset: number,
      leftOffset: number,
      cssClassHidden: string;
      cssClassOpenTop: string;
    }) {
    let { top, left, height, width } = target.getBoundingClientRect();
    top = top + height + options.topOffset;
    left = left + width / 2 - options.leftOffset;

    document.body.appendChild(element);

    const style = element.style;
    style.display = 'unset';
    style.position = 'absolute';
    style.left = `${left}px`;

    element.classList.remove(options.cssClassHidden);

    if (top + options.height - 20 > window.scrollY + window.innerHeight) {
      top -= options.height;
      element.classList.add(options.cssClassOpenTop);
    }

    style.top = `${top}px`;

    if (this.scrollParent) {
      const scrollParent = this.scrollParent;
      this.scrollTop = scrollParent.scrollTop;

      this.scrollListener = (ev: Event) => {
        const scrollElement = ev.target as HTMLElement;
        const moved = scrollElement.scrollTop - this.scrollTop;
        element.style.top = `${top - moved}px`;
      };

      scrollParent.addEventListener('scroll', this.scrollListener);
    }
  }

  save() {
    this.selectedColorChange.emit(this.selectedColor);
    this.close();
  }

  cancel() {
    this.selectedColor = this.defaultColor;
    this.close();
  }

  static destroy() {
    document.querySelectorAll(`.${ColorPickerComponent.cssClassDropdown}`)?.forEach(e => e.remove());
  }

  close() {
    this.isColorPickerOpen = false;
    this.isColorChanged = false;
    // cleanup left over if any. happens if component re-renders before closing color dropdown
    document.querySelectorAll(`.${ColorPickerComponent.cssClassDropdown}`).forEach(e => e.remove());

    if (this.scrollParent && this.scrollListener) {
      this.scrollParent.removeEventListener('scroll', this.scrollListener);
      this.scrollListener = null;
    }
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
