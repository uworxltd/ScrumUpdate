/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { Constants } from 'app/constants';
import { Subscription } from 'rxjs';
import { Store } from '@ngrx/store';
import { AppState } from 'app/states/app-states';
import * as filterSelectors from 'app/states/global-filters.selector';
import * as actions from 'app/states/app.actions';
import { FeatureFlagService } from 'app/services/feature.flag.service';
import { CalendarModule } from 'primeng/calendar';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OverlayPanel, OverlayPanelModule } from 'primeng/overlaypanel';
import { endOfMonth, endOfWeek, endOfYear, isSameDay, startOfMonth, startOfWeek, startOfYear, subDays, subMonths, subWeeks, subYears, format as formatDate, parse as parseDate, addDays, isAfter } from 'date-fns';
export type DateLabel = 'Today' | 'Yesterday' | 'This Week' | 'Last Week' | 'Last 3 Days' | 'Last 7 Days' | 'Last 30 Days' | 'This Month' | 'Last Month' | 'This Year' | 'Last Year' | 'Custom Range';

export function getDefaultDateRanges() {
  const today = new Date();
  const yesterday = subDays(today, 1);
  const prevWeek = subWeeks(today, 1);
  const prevMonth = subMonths(today, 1);
  const prevYear = subYears(today, 1);

  return [
    { label: 'Today', range: [today, today] },
    { label: 'Yesterday', range: [yesterday, yesterday] },
    { label: 'This Week', range: [addDays(startOfWeek(today), 1), today] },
    { label: 'Last Week', range: [addDays(startOfWeek(prevWeek), 1), addDays(endOfWeek(prevWeek), 1)] },
    { label: 'Last 3 Days', range: [subDays(today, 3), today] },
    { label: 'Last 7 Days', range: [subDays(today, 7), today] },
    { label: 'Last 15 Days', range: [subDays(today, 15), today] },
    { label: 'This Month', range: [startOfMonth(today), today] },
    { label: 'Last Month', range: [startOfMonth(prevMonth), endOfMonth(prevMonth)] },
    { label: 'This Year', range: [startOfYear(today), today] },
    { label: 'Last Year', range: [startOfYear(prevYear), endOfYear(prevYear)] },
  ];
}

export function getDefaultDateRangesAsObject() {
  return getDefaultDateRanges().reduce((a, c) => {
    a[c.label] = c.range;
    return a;
  }, {});
}

export function getDateLabel(start: Date, end: Date) {
  const dateRange = getDefaultDateRangesAsObject();
  let dateLable: DateLabel;

  for (const lable in dateRange) {
    const range = dateRange[lable];

    if (isSameDay(start, range[0]) && isSameDay(end, range[1])) {
      dateLable = <DateLabel>lable;
      break;
    }
  }

  return dateLable || 'Custom Range';
}

export function getDateRange(dateLabel: DateLabel) {
  if (!dateLabel) return null;
  const ranges = getDefaultDateRangesAsObject();
  return dateLabel in ranges ? ranges[dateLabel] : null;
}

const _parseDate = (date: string, rangeSide?: 'Min' | 'Max') => {
  if (rangeSide) {
    const dateRanges = getDefaultDateRangesAsObject();

    if (date in dateRanges) {
      const range = dateRanges[date];
      return rangeSide === 'Min' ? range[0] : range[1];
    }
  }

  return parseDate(date, Constants.DATE_FORMAT, new Date());
}

@Component({
  selector: 'khoji-daterange',
  templateUrl: './date-range.component.html',
  styleUrls: ['./date-range.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    OverlayPanelModule,
    CalendarModule,
  ],
})
export class DateRangeComponent implements OnInit, OnDestroy {
  constants = Constants;
  subscription = new Subscription();
  @ViewChild('overlayPanel') overlayPanel: OverlayPanel;

  // ui model
  overlayVisible = false;
  dateRanges = getDefaultDateRanges();
  selectedDateRange: Date[] = [];
  selectedDateLabel: DateLabel;
  calendarVisible = false;
  selectedDateRangeText: string;

  // component state
  _dateRangeText: string;
  _dateLabel: DateLabel;
  _startDate = subDays(new Date(), 7);
  _endDate = new Date();
  _minDate: Date;
  _maxDate: Date;

  @Input() isDisabled = false;
  @Input() label: string;
  @Input() classNames: string;

  @Input()
  set dateLabel(val: DateLabel) {
    if (typeof val !== 'string') return;
    this._dateLabel = val;
  }

  @Input()
  set startDate(val: string) {
    if (typeof val !== 'string') return;
    this._startDate = _parseDate(val, 'Min');
  }

  @Input()
  set endDate(val: string) {
    if (typeof val !== 'string') return;
    this._endDate = _parseDate(val, 'Max');
  }

  @Input()
  set minDate(val: string) {
    if (typeof val !== 'string') return;
    this._minDate = _parseDate(val, 'Min');
    this.dateRanges = this.dateRanges.filter(dr => isAfter(dr.range[0], this._minDate) || isSameDay(dr.range[0], this._minDate));
  }

  @Input()
  set maxDate(val: string) {
    if (typeof val !== 'string') return;
    if (val === 'today') val = new Date().toISOString().split('T')[0];
    this._maxDate = _parseDate(val, 'Max');
  }

  @Input() displayDateFormat = 'MMM d, yyyy';
  @Output() onChange = new EventEmitter();

  constructor(private store: Store<AppState>, private flag: FeatureFlagService) { }

  ngOnInit() {
    const dateLabel$ = this.store.pipe(filterSelectors.selectDateLabel);
    const dateRange$ = this.store.pipe(filterSelectors.selectDateRange);

    this.subscription.add(dateLabel$.subscribe(data => {
      this._dateLabel = data.dateLabel;

      if (data.dateLabel) {
        const range = getDateRange(data.dateLabel);

        if (range) {
          this._endDate = range[1];
          this._startDate = range[0];
          this.updateUI();
          this.updateSelectionUI(range[0], range[1], data.dateLabel);
        }
      }
    }));

    this.subscription.add(dateRange$.subscribe(data => {
      this._startDate = _parseDate(data.dateFrom);
      this._endDate = _parseDate(data.dateTo);

      this.updateUI();
      this.updateSelectionUI(this._startDate, this._endDate);
    }));
  }

  showOverlay(visible: boolean, event?: Event) {
    this.overlayVisible = visible;

    if (this.overlayVisible) {
      this.overlayPanel?.show(event);
      this.calendarVisible = this._dateLabel === 'Custom Range';
    } else {
      this.overlayPanel?.hide();
    }
  }

  onLabelSelect(label: DateLabel) {
    if (label === 'Custom Range') {
      this.calendarVisible = !this.calendarVisible;
      return;
    }

    this.selectedDateLabel = label;

    const [startDate, endDate] = getDateRange(label);
    this.updateSelectionUI(startDate, endDate, label);
    this.dispatch(); // will update control through selectors' subscription above
  }

  // calendar selection
  onRangeSelect() {
    const [startDate, endDate] = this.selectedDateRange;
    this.updateSelectionUI(startDate, endDate);
  }

  dispatch() {
    const frmt = 'dd-MM-Y';
    // compare state with selection
    const [startDate, endDate] = this.selectedDateRange;
    const dateRangeChanged = `${formatDate(this._startDate, frmt)}-${formatDate(this._endDate, frmt)}` !== `${formatDate(startDate, frmt)}-${formatDate(endDate, frmt)}`;

    if (dateRangeChanged) {
      this.store.dispatch(actions.selectDateRange({
        dateFrom: formatDate(startDate, Constants.DATE_FORMAT),
        dateTo: formatDate(endDate, Constants.DATE_FORMAT)
      }));
    }

    // compare state with selection
    const dateLabelChanged = this._dateLabel !== this.selectedDateLabel;

    if (dateLabelChanged) {
      this.store.dispatch(actions.selectDateLabel({ dateLabel: this.selectedDateLabel }));
    }

    this.showOverlay(false);
  }

  // restore selection ui from state
  cancel() {
    this.updateSelectionUI(this._startDate, this._endDate);
    this.showOverlay(false);
  }

  /** update ui with component state */
  updateUI() {
    this._dateRangeText = formatDate(this._startDate, this.displayDateFormat) + ' - ' + formatDate(this._endDate, this.displayDateFormat);
  }

  /** update ui with selection */
  updateSelectionUI(startDate: Date, endDate?: Date, dateLabel?: DateLabel) {
    if (!dateLabel && endDate) {
      dateLabel = getDateLabel(startDate, endDate);
    }

    this.selectedDateLabel = dateLabel || 'Custom Range';
    this.selectedDateRange = [startDate, endDate];
    this.selectedDateRangeText = formatDate(startDate, this.displayDateFormat) + ' - ' + (endDate ? formatDate(endDate, this.displayDateFormat) : '');
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}
