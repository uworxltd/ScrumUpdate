import { AfterContentInit, AfterViewInit, Component, ContentChildren, ElementRef, OnDestroy, OnInit, QueryList, ViewChild } from '@angular/core';
import { fromEvent, merge, Subscription } from 'rxjs';
import { debounceTime, delay } from 'rxjs/operators';
import { SlideDirective } from './slide.directive';

@Component({
  selector: 'khoji-slider',
  templateUrl: './slider.component.html',
  styleUrls: ['./slider.component.scss']
})
export class SliderComponent implements AfterViewInit, AfterContentInit, OnInit, OnDestroy {
  showControls = false;
  subscription = new Subscription();

  firstIndex = 0;
  lastIndex = 0;
  @ContentChildren(SlideDirective) slides!: QueryList<SlideDirective>;
  @ViewChild('scroller', { static: true }) scroller!: ElementRef<HTMLDivElement>;

  constructor() { }

  ngOnInit(): void { }

  ngAfterViewInit(): void {
    const sub = merge(
      fromEvent(this.scroller.nativeElement, 'scroll'),
      fromEvent(window, 'resize')
    )
      .pipe(debounceTime(50))
      .subscribe(() => this.updateIndices());

    this.subscription.add(sub)
  }

  ngAfterContentInit(): void {
    const sub = this.slides.changes
      .pipe(delay(100))
      .subscribe(() => this.updateIndices());

    this.subscription.add(sub);
  }

  updateIndices() {
    const slides = this.slides.toArray();

    const positions = slides.map(slide => {
      const { position: { left, right } } = slide;
      return { slide, left, right };
    });

    const { width: scrollEnd } = this.scroller.nativeElement.getBoundingClientRect();
    const visiblePositions = positions.filter(position => position.left - 25 > 0 && position.right - 35 < scrollEnd);

    const [firstPosition] = visiblePositions;
    const lastPosition = visiblePositions[visiblePositions.length - 1];

    this.firstIndex = slides.indexOf(firstPosition?.slide);
    this.lastIndex = slides.lastIndexOf(lastPosition?.slide);

    this.showControls = this.slides.length - 1 > this.lastIndex - this.firstIndex;
  }

  scrollToSlide(index: number) {
    if (index < 0) {
      index = 0;
    }
    else if (index > this.slides.length - 1) {
      index = this.slides.length - 1;
    }

    const left = this.slides.get(index).offsetLeft;
    this.scroller.nativeElement.scroll({ left: left - 30, behavior: 'smooth' });
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
