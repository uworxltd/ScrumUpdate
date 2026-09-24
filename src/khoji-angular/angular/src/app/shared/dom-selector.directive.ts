/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { Directive, ElementRef, Input } from "@angular/core";

export class PositionElement extends HTMLElement {
    position: DOMRect;
}

@Directive({
    selector: '[khoji-dom-selector]',
    exportAs: 'domSelector',
    standalone: true,
})
export class DomSelector {
    #selector = '';
    #element: HTMLElement = null;

    @Input('khoji-dom-selector')
    set attribute(selector: string) {
        this.#selector = selector;
    }

    constructor(element: ElementRef<HTMLElement>) {
        this.#element = element.nativeElement;
    }

    get parent(): PositionElement {
        const element = this.#element.closest<HTMLElement>(this.#selector);
        return {
            ...element,
            position: element.getBoundingClientRect(),
        }
    }
}
