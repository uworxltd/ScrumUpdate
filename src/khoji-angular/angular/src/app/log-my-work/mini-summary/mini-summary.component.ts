import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, Subscription } from 'rxjs';
import { EChartOption } from 'echarts/lib/echarts';
import { WorklogSummaryData } from 'app/team-worklog/team-work-logged-percentage/team-work-logged-percentage.component';
import { AppState } from 'app/states/app-states';
import { Store } from '@ngrx/store';
import { TrackingService } from 'app/services/tracking';
import { selectWorklogSummaryTransformed } from '../state/log-my-work.selector';
import { NgxEchartsModule } from 'ngx-echarts';
import { selectTranslation } from 'app/states/global-translations.selector';
import { DividerModule } from 'primeng/divider';
import { selectWeekendStatsTooltip } from 'app/states/global-configs.selector';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'khoji-mini-summary',
  standalone: true,
  imports: [
    CommonModule,
    NgxEchartsModule,
    DividerModule,
    TooltipModule
  ],
  templateUrl: './mini-summary.component.html',
  styleUrls: ['./mini-summary.component.scss']
})
export class MiniSummaryComponent implements OnInit, OnDestroy {
  translation$: Observable<any>;
  subscription = new Subscription();
  summaryData: WorklogSummaryData;
  chartOption: EChartOption<EChartOption.Series> = {};
  tooltipForAvailableCapacity: string = '';

  constructor(private store: Store<AppState>, private trackingService: TrackingService) { }

  ngOnInit(): void {
    this.translation$ = this.store.pipe(selectTranslation);

    const weekendStatsTooltip$ = this.store.pipe(selectWeekendStatsTooltip);

    this.subscription.add(
      weekendStatsTooltip$.subscribe((tooltip) => {
        this.tooltipForAvailableCapacity = tooltip;
      })
    );

    const worklogSummary$ = this.store.pipe(selectWorklogSummaryTransformed);
    this.subscription.add(worklogSummary$.subscribe(data => {
      this.summaryData = data.summaryData;
      this.prepareChart();
    }));
  }

  prepareChart() {
    this.chartOption = {
      series: [
        {
          type: 'gauge',
          startAngle: 90,
          endAngle: -269.99,
          pointer: {
            show: false
          },
          center: ['50%', '50%'],
          axisLine: {
            lineStyle: {
              width: 5,
              color: [
                [+this.summaryData.loggedPercentage.toFixed(2) / 100, this.summaryData.color],
                [1, '#e0e0e0']
              ]
            }
          },
          splitLine: {
            show: false
          },
          axisTick: {
            show: false
          },
          axisLabel: {
            show: false
          },
          detail: {
            show: false
          },
          data: [{ value: parseFloat(this.summaryData.loggedPercentage.toFixed(2)) }],
          radius: '15'
        }
      ]
    };
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

}
