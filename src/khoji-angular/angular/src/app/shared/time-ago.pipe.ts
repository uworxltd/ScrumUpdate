import { Pipe, PipeTransform, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { formatDistanceToNow } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

@Pipe({
  name: 'timeAgo',
  pure: false,       // <-- allows auto-refresh
  standalone: true
})
export class TimeAgoPipe implements PipeTransform, OnDestroy {
  private timer?: ReturnType<typeof setInterval>;

  constructor(private cdr: ChangeDetectorRef) { }

  transform(value: Date | string | number, refreshMs = 5000): string {
    if (!value) return '';

    // ✅ Convert UTC date to your local timezone

    const localDate = toZonedTime(new Date(value), Intl.DateTimeFormat().resolvedOptions().timeZone);
    // ✅ Setup auto-refresh once
    if (!this.timer) {
      this.timer = setInterval(() => {
        this.cdr.markForCheck();
      }, refreshMs);
    }

    return formatDistanceToNow(localDate, { addSuffix: true });
  }

  ngOnDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }
}
