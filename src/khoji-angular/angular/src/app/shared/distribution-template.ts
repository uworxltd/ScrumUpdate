import { Component, Input, OnInit } from "@angular/core";
import { Store } from "@ngrx/store";
import { AppState } from "app/states/app-states";
import { selectTranslation } from "app/states/global-translations.selector";
import { Subscription } from "rxjs";
import { ChartComponent } from "./chart/chart.component";
import { Constants } from "app/constants";


@Component({
  selector: '[distributionTemplate]',
  template: `
        <p-splitter [panelSizes]="[35, 65]" [style]="{background: 'transparent', border: 'none'}" [gutterSize]="2" class="splitter">
          <ng-template pTemplate>
            <div class="flex align-items-center">
              <div class="flex align-items-start flex-column">
                <span
                  class="text-md"
                >
                  {{translation.filter.status.inProgress}}
                </span>
                <div
                  class="flex align-items-baseline justify-content-start"
                >
                  <span
                    class="text-2xl font-bold"
                  >
                    {{item.weightage.total}}
                  </span>
                  <span
                    class="text-md ml-2"
                    *ngIf="showLabel"
                  >
                    {{this.item.weightage.label}}
                  </span>
                </div>
              </div>
            </div>
          </ng-template>

          <ng-template pTemplate>
            <div class="flex align-items-center justify-content-center w-full">
              <div echarts [options]="chartOption" style="width: 100%; height: 100%;"></div>
            </div>
          </ng-template>
        </p-splitter>
  `,
  styles: [
    '.splitter { height: 83%; display: grid; }',
    ':host ::ng-deep .p-splitter .p-splitter-gutter { display: none !important }'
  ],
})
export class DistributionTemplate extends ChartComponent implements OnInit {
  @Input() item: any;
  translation: any;
  subscription = new Subscription();
  showLabel: boolean = true;

  constructor(store: Store<AppState>) {
    super(store);
  }


  ngOnInit() {
    this.prepareChart(this.prepareBarChartData(this.item.graphData));
    this.subscription.add(
      this.store.pipe(selectTranslation).subscribe(translation => {
        this.translation = translation;
      })
    );
    this.showLabel = this.item.weightage.label !== 'Issues'
  }

  private prepareBarChartData(graphData) {
    return graphData
      .filter(data => data.count !== 0)
      .map(data => {
        return {
          name: data.statusName + ' Issues',
          value: data.count,
          unit: this.item.weightage.label
        };
      });

  }


  prepareChart(data) {
    this.chartOption = {
      xAxis: {
        type: 'category',
        show: true,
        name: "Status Breakdown",
        nameLocation: 'middle',
        nameTextStyle: {
          color: Constants.PRIMARY_TEXT_COLOR,
          fontSize: 14
        },
        axisLine: {
          lineStyle: {
            color: 'transparent'
          }
        }
      },
      yAxis: {
        show: false
      },
      tooltip: {
        show: true,
        trigger: 'item',
        position: function (pos: any, params, dom: any, rect, size: any) {
          let obj: any = { top: pos[1] - 40 };
          let tooltipWidth = dom.offsetWidth;
          let mousePosX = pos[0];
          let halfTooltipWidth = tooltipWidth / 2;
          let leftPos = mousePosX - halfTooltipWidth;
          leftPos = Math.max(leftPos, 5);
          leftPos = Math.min(leftPos, size.viewSize[0] - tooltipWidth - 5);
          obj.left = leftPos;
          return obj;
        },
        textStyle: {
          fontSize: 12
        }
      },
      series: [{
        data,
        type: 'bar',
        tooltip: {
          //@ts-ignore
          show: true,
          trigger: 'item',
          formatter: function (params: any) {
            return `${params.name}: ${params.value} ${params.data.unit}`
          }
        },
        itemStyle: {
          color: Constants.INPROGRESS,
        },
      }]
    };
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}
