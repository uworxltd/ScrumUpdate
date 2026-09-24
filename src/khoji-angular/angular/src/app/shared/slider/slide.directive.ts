import { Directive, ElementRef } from "@angular/core";

@Directive({
  selector: '[khoji-slide]'
})
export class SlideDirective {
  constructor(private eleRef: ElementRef<HTMLElement>) { }

  get offsetLeft() {
    return this.eleRef.nativeElement.offsetLeft;
  }

  get position() {
    return this.eleRef.nativeElement.getBoundingClientRect();
  }
}