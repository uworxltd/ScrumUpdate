/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { EChartsOption } from 'echarts';
import { NgxEchartsModule } from 'ngx-echarts';

export interface BurndownChartPoint {
  day: number;
  date?: string;
  remaining: number | null;
  ideal: number;
}

export interface SprintVelocityBurndownData {
  title?: string;
  scopePoints: number;
  // committedScope is the original day-1 committed scope (kept for diagnostics)
  committedScope?: number;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  sprintOverrun: number;
  currentVelocity: number;
  velocityChange: number;
  requiredVelocity: number;
  actualShortfall: number;
  projectedShortfall: number;
  avgPerSprint: number;
  daysElapsed?: number;
  isOverrun?: boolean;
  burndownChart: BurndownChartPoint[];
}

@Component({
  selector: 'khoji-sprint-velocity-burndown-card',
  standalone: true,
  templateUrl: './sprint-velocity-burndown-card.component.html',
  styleUrls: ['./sprint-velocity-burndown-card.component.scss'],
  imports: [
    CommonModule,
    NgxEchartsModule,
  ],
})
export class SprintVelocityBurndownCardComponent implements OnInit {
  private _velocityData: SprintVelocityBurndownData | null = null;
  
  // Pre-computed values for template
  velocityChangeIcon = '';
  velocityChangeClass = '';
  chartData: any = null;
  chartOption: EChartsOption;
  hasData = false;
  missingDataReason = '';
  
  @Input() 
  set velocityData(value: SprintVelocityBurndownData | null) {
    this._velocityData = value;
    const dataCheck = this.checkDataAvailability(value);
    this.hasData = dataCheck.hasData;
    this.missingDataReason = dataCheck.reason;
    this.updateComputedValues();
  }
  get velocityData(): SprintVelocityBurndownData | null {
    return this._velocityData;
  }

  /**
   * Check if velocity/burndown data is available and meaningful
   * Returns object with hasData boolean and reason string
   */
  private checkDataAvailability(data: SprintVelocityBurndownData | null): { hasData: boolean, reason: string } {
    if (!data) {
      return { hasData: false, reason: 'No burndown data available for this sprint.' };
    }

    // Check if sprint has overrun (past end date)
    // if (data.isOverrun) {
    //   return { 
    //     hasData: false, 
    //     reason: 'Sprint is past its end date. Burndown data is only generated during the scheduled sprint period.' 
    //   };
    // }

    // Check if we have burndown chart data
    if (!data.burndownChart || data.burndownChart.length === 0) {
      return { 
        hasData: false, 
        reason: 'No burndown data available. Sprint may not have started yet.' 
      };
    }

    return { hasData: true, reason: '' };
  }
    
  constructor() {
  }

  ngOnInit(): void {
    // Initialize chart on component init
    this.updateComputedValues();
  }

  private updateComputedValues(): void {
    if (!this._velocityData) {
      this.velocityChangeIcon = '';
      this.velocityChangeClass = '';
      this.chartData = null;
      return;
    }

    // Compute velocity change icon and class
    const change = this._velocityData.velocityChange;
    if (change === 0) {
      this.velocityChangeIcon = 'pi-minus';
      this.velocityChangeClass = 'text-color-secondary';
    } else if (change > 0) {
      this.velocityChangeIcon = 'pi-arrow-up';
      this.velocityChangeClass = 'text-green-700';
    } else {
      this.velocityChangeIcon = 'pi-arrow-down';
      this.velocityChangeClass = 'text-red-600';
    }

    // Generate chart data
    this.generateChartData();
  }

  private generateChartData(): void {
    if (!this._velocityData?.burndownChart || this._velocityData.burndownChart.length === 0) {
      this.chartData = null;
      this.chartOption = null;
      return;
    }

    // Show all days for labels and ideal line, but only elapsed days for actual line
    const labels = this._velocityData.burndownChart.map(point => `${point.day}`);
    const actualData = this._velocityData.burndownChart.map(point => point.remaining);
    const idealData = this._velocityData.burndownChart.map(point => point.ideal);
    
    // Calculate projected line based on current velocity
    const projectedData: (number | null)[] = new Array(labels.length).fill(null);
    const daysElapsed = this._velocityData.daysElapsed || 0;
    
    if (daysElapsed > 0 && this._velocityData.currentVelocity > 0) {
      // Find the last actual value (current day)
      const lastActualIndex = daysElapsed - 1;
      const lastActualValue = actualData[lastActualIndex];
      
      if (lastActualValue !== null && lastActualValue !== undefined) {
        // Project from current day to end of sprint
        for (let i = lastActualIndex; i < labels.length; i++) {
          const daysFromNow = i - lastActualIndex;
          const projectedRemaining = Math.max(0, lastActualValue - (this._velocityData.currentVelocity * daysFromNow));
          projectedData[i] = projectedRemaining;
        }
      }
    }

    this.chartData = { labels, actualData, idealData, projectedData };
    this.drawChart();
  }

  private drawChart(): void {
    if (!this.chartData) {
      this.chartOption = null;
      return;
    }

    this.chartOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        formatter: (params: any) => {
          if (Array.isArray(params)) {
            let result = `Day ` + params[0].axisValue + '<br/>';
            params.forEach((param: any) => {
              if (param.value != null && !isNaN(param.value)) {
                result += `${param.marker} ${param.seriesName}: ${parseFloat(param.value).toFixed(0)} pts<br/>`;
              }
            });
            return result;
          }
          return '';
        }
      },
      legend: {
        top: 'top',
        right: '5%',
        textStyle: { fontSize: 12, fontWeight: 500 }
      },
      grid: {
        top: 30,
        right: 10,
        bottom: 20,
        left: 20,
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: this.chartData.labels,
        axisLabel: { fontSize: 11, color: '#64748b' },
        axisLine: { lineStyle: { color: '#64748b' } },
        splitLine: { show: false }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          fontSize: 11,
          color: '#64748b',
        },
        splitLine: { lineStyle: { color: 'rgba(226, 232, 240, 0.5)' } },
        axisTick: { show: true }
      },
      series: [
        {
          name: 'Ideal',
          data: this.chartData.idealData,
          type: 'line',
          lineStyle: { color: '#64748b', width: 2 },
          symbol: 'circle',
          symbolSize: 6,
          itemStyle: { color: '#64748b', borderColor: '#fff', borderWidth: 2 }
        },
        {
          name: 'Actual',
          data: this.chartData.actualData,
          type: 'line',
          lineStyle: { color: '#1d4ed8', width: 2.5 },
          symbol: 'circle',
          symbolSize: 6,
          itemStyle: { color: '#1d4ed8', borderColor: '#fff', borderWidth: 2 }
        },
        {
          name: 'Projected',
          data: this.chartData.projectedData,
          type: 'line',
          lineStyle: { color: '#a47d06', width: 2 },
          symbol: 'circle',
          symbolSize: 6,
          itemStyle: { color: '#a47d06', borderColor: '#fff', borderWidth: 2 }
        }
      ]
    };
  }


  hasVelocityData(): boolean {
    return this._velocityData != null;
  }

  formatNumber(num: number | undefined | null): string {
    if (num == null) return '0';
    return num.toFixed(1);
  }
}
