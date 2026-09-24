/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { Component, Input, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { Constants } from 'app/constants';
import { AppState } from 'app/states/app-states';
import { ChartComponent } from '../chart.component';


export interface PiChartOptions {
  downloadedChartImageName?: string;
  saveAsImageTitleIconTooltip?: string;
  showDownloadButton?: boolean;
  colors?: string[];
}

export interface PiChartData {
  value: number | string;
  name: string;
  label?: { show: boolean };
  labelLine?: { show: boolean };
  units?: string;
}

@Component({
  selector: 'khoji-pi-chart',
  templateUrl: './pi-chart.component.html',
  styleUrls: ['./pi-chart.component.scss'],
})
export class PiChartComponent extends ChartComponent implements OnInit {

  @Input() customChartOptions?: PiChartOptions;
  @Input() chartData?: PiChartData[];
  @Input() compactChartData?: PiChartData[];
  @Input() includeUnits?: boolean;

  constructor(store: Store<AppState>) {
    super(store);
  }


  ngOnInit(): void {
    if (this.chartData) {
      this.chartData.every(item => item.value === '') ? this.drawEmptyChart() : this.drawChart(this.chartData);
    } else if (this.compactChartData) {
      this.compactChartData.every(item => item.value === '') ? this.renderEmptyCompactChart() : this.renderCompactChart(this.compactChartData);
    }
  }

  drawEmptyChart() {
    this.chartOption = {
      title: this.getTitle(),
      legend: {
        padding: [10, 0, 10, 0],
        selectedMode: false
      },
      series: [
        {
          type: 'pie',
          radius: [0, '42%'],
          hoverAnimation: false,
          label: {
            show: false
          },
          itemStyle: {
            color: '#D3D3D3',
            // @ts-ignore
            emphasis: {
              color: '#D3D3D3'
            }
          },
          data: [
            { value: 100, name: 'Open' },
            { value: 0, name: 'In Progress' },
            { value: 0, name: 'Resolved' }
          ]
        }
      ],
      animation: this.defaultOptions.animation
    };
  }




  drawChart(data) {
    this.chartOption = {
      title: this.getTitle(),
      legend: {
        padding: [10, 0, 10, 0],
      },
      textStyle: { fontFamily: Constants.ECHARTS_FONT_STYLE },
      color: this.customChartOptions.colors,
      toolbox: {
        right: 3,
        show: this.customChartOptions.showDownloadButton,
        feature: {
          saveAsImage: {
            name: this.customChartOptions.downloadedChartImageName,
            title: this.customChartOptions.saveAsImageTitleIconTooltip
          }
        }
      },
      series: [
        {
          type: 'pie',
          center: ['48%', '50%'],
          selectedMode: 'single',
          radius: [0, '42%'],
          // @ts-ignore
          legend: {
            orient: 'horizontal',
            left: 'left'
          },
          label: {
            // @ts-ignore
            normal: {
              formatter: this.includeUnits ? '\n{b|{b}}: {c} d {per|{d}%}' : '\n{b|{b}}: {c} {per|{d}%}',
              backgroundColor: '#eee',
              borderColor: '#aaa',
              borderRadius: 6,
              padding: [-12, 7, 0, 7],
              fontWeight: 'bold',
              rich: {
                a: {
                  color: '#333',
                  lineHeight: 22,
                  align: 'center',
                  fontWeight: 'bold'
                },
                hr: {
                  borderColor: '#aaa',
                  width: '100%',
                  borderWidth: 0.5,
                  height: 0,
                  fontWeight: 'bold'
                },
                b: { fontSize: 12, lineHeight: 33, fontWeight: 'bold' },
                per: {
                  color: '#eee',
                  backgroundColor: '#grey',
                  padding: [4, 6],
                  borderRadius: 5,
                  fontWeight: 'bold'
                }
              }
            }
          },
          data,
        }
      ],
      animation: super.defaultOptions.animation
    };

  }

  renderEmptyCompactChart() {
    this.chartOption = {
      series: [
        {
          type: 'pie',
          radius: [0, '100%'],
          hoverAnimation: false,
          label: {
            show: false
          },
          itemStyle: {
            color: '#D3D3D3',
            // @ts-ignore
            emphasis: {
              color: '#D3D3D3'
            }
          },
          data: [
            { value: 100, name: 'Open' },
            { value: 0, name: 'In Progress' },
            { value: 0, name: 'Resolved' }
          ],
        }
      ],
      animation: super.defaultOptions.animation,
    };
  }

  renderCompactChart(data) {
    this.chartOption = {
      tooltip: {
        trigger: 'item',
      },
      color: ['#929397', '#C7B42C', '#5AA454'],
      series: [
        {
          type: 'pie',
          tooltip: {
            // @ts-ignore
            trigger: 'item',
            formatter: function (params: any) {
              return `${params.name}: ${params.value} ${params.data.unit}`
            }
          },
          itemStyle: {
            // @ts-ignore
            normal: {
              borderWidth: data.filter(item => item.value > 0).length === 1 ? 0 : 1,
              borderColor: '#fff',
            }
          },
          radius: [0, '100%'],
          data,
        }
      ],
      animation: super.defaultOptions.animation,
    };
  }
}
