import { Directive, ElementRef, Input } from '@angular/core';

@Directive({
    selector: 'img[khoji-image]',
    standalone: true,
})
export class ImageDirective {
    #image: [string, string];

    @Input('khoji-image')
    set image(value: [string, string]) {
        if (!value || !value[0]) return;
        const img = new Image();
        img.src = value[0];
        img.onload = () => this.el.nativeElement.src = value[0];
        img.onerror = () => this.el.nativeElement.src = value[1];
    }

    constructor(private el: ElementRef) { }
}