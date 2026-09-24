import { CommonModule } from "@angular/common";
import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, Output, SimpleChanges, ViewChild } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Calendar, CalendarModule } from "primeng/calendar";
import { addDays, addWeeks, startOfWeek, endOfWeek } from 'date-fns';
import { Store } from "@ngrx/store";
import { AppState } from "app/states/app-states";
import { discardSentCallsAfterNavigate } from "app/states/app.actions";

@Component({
    selector: 'khoji-week-input',
    templateUrl: './week-input.component.html',
    styleUrls: ['./week-input.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        CalendarModule
    ]
})
export class WeekInputComponent implements AfterViewInit {
    selectedDate: Date;
    isNextWeekAvailable = true;

    @ViewChild(Calendar) calendar: Calendar;
    @ViewChild('container') container: ElementRef<HTMLDivElement>;

    @Input() maxDate: Date;
    @Input() maxWeek: [Date, Date];
    @Input() value: [Date, Date];
    @Input() loading = false;
    @Input() timeZone: string;
    @Output() onChange = new EventEmitter<[Date, Date]>();
    @Output() _isNextWeekAvailable = new EventEmitter<boolean>();

    constructor(private cdr: ChangeDetectorRef, private store: Store<AppState>) { }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['value']) {
          this.updateValue();
        }
      }

    handleOnSelect() {
        this.store.dispatch(discardSentCallsAfterNavigate());
        this.updateValue();
        this.calendar.toggle();
    }

    updateValue() {
        this.selectedDate = this.value[0];
        this.value = getWeek(this.selectedDate);
        this.onChange.emit(this.value);

        // check weeks availability
        if (this.maxWeek) {
            const nextWeek = addWeek(this.value, 1);
            this.isNextWeekAvailable = nextWeek[0].getTime() <= this.maxWeek[0].getTime();
            this._isNextWeekAvailable.emit(this.isNextWeekAvailable);
        }
    }

    handleDateClick() {
        this.container.nativeElement.querySelector<HTMLDivElement>('.p-calendar .p-button').click();
    }

    handleWeekClick(value: number) {
        this.store.dispatch(discardSentCallsAfterNavigate());
        this.value = addWeek(this.value, value);
        this.updateValue();
        this.showTodayForCurrentWeek();
    }

    showTodayForCurrentWeek() {
        if (isSameWeek(this.value, getWeek(null, this.timeZone))) {
            this.selectedDate = new Date();
        }
    }

    ngAfterViewInit(): void {
        if (!this.value || !this.value[0]) {
            this.value = getWeek(null, this.timeZone);
        }

        this.updateValue();
        this.showTodayForCurrentWeek();
        this.cdr.detectChanges();
    }
}

export function getStartOfWeek(date?: Date, timeZone?: string) {
    if (!date) date = new Date();
    // By default, the week starts on Sunday. We need to start the week on Monday.
    const tz = addDays(getTimeZoneDate(date, timeZone), -1);
    return addDays(startOfWeek(tz), 1);
}

export function getEndOfWeek(date?: Date, timeZone?: string) {
    if (!date) date = new Date();
    // By default, the week starts on Sunday. We need to start the week on Monday.
    const tz = addDays(getTimeZoneDate(date, timeZone), -1);
    return addDays(endOfWeek(tz), 1);
}

export function getWeek(date?: Date, timeZone?: string): [Date, Date] {
    return [getStartOfWeek(date, timeZone), getEndOfWeek(date, timeZone)];
}

export function addWeek(week: [Date, Date], value: number): [Date, Date] {
    return [addWeeks(week[0], value), addWeeks(week[1], value)];
}

export function isSameWeek(week1: [Date, Date], week2: [Date, Date]): boolean {
    return week1[0].getTime() === week2[0].getTime() && week1[1].getTime() === week2[1].getTime();
}


export function getTimeZoneDate(date: Date, timeZone: string) {
    const timeZoneDateParts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(date);

    const year = timeZoneDateParts.find(part => part.type === 'year')?.value;
    const month = timeZoneDateParts.find(part => part.type === 'month')?.value;
    const day = timeZoneDateParts.find(part => part.type === 'day')?.value;

    return new Date(`${year}-${month}-${day}`);
}
