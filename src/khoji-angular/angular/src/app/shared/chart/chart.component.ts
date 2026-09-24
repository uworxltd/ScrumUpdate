import { Component, Input } from "@angular/core";
import { Store } from "@ngrx/store";
import { Constants } from 'app/constants';
import { KhojiConfigs } from 'app/interface/khoji-config.interface';
import { AppState } from 'app/states/app-states';
import { combineLatest, Subscription } from "rxjs";
import { map } from "rxjs/operators";
import { setComponentStateForReport } from "../helper-functions";
import { selectTranslation } from "app/states/global-translations.selector";
import { selectGlobalConfig } from 'app/states/global-configs.selector';
import { ParentIssueDataModel } from "app/datamodels/issue.datamodel";
import { EChartsOption } from "echarts";

@Component({ template: `` })
export class ChartComponent {
    componentId: string;
    chartOption: EChartsOption;
    subscription = new Subscription();
    stats: any;
    translation: any; // TODO: add types
    setStateForReport: setComponentStateForReport = setComponentStateForReport.bind(this);
    message: string;
    khojiConfigs: KhojiConfigs;
    componentLoading: boolean = false;

    @Input() showDownloadButton = true;
    @Input() fetchOwnData = false;
    @Input() disabled = false;
    @Input() showToolTip = true;

    constructor(protected store: Store<AppState>) { }

    init() {
        if (!this.componentId) throw new Error('property componentId is required');

        this.loading();
        this.setStateForReport(this.componentId, false);

        const translation$ = this.store.pipe(
            selectTranslation,
            map(data => {
                // TODO: make translation sepecific by using chart name like data.translation.team['qualityAnalysis']
                this.translation = data;
                return data;
            })
        );

        const khojiConfigs$ = this.store.pipe(selectGlobalConfig).pipe(
            map(data => {
                this.khojiConfigs = data;
                return this.khojiConfigs;
            })
        );

        return combineLatest([translation$, khojiConfigs$]);
    }

    get defaultOptions() {
        const options: EChartsOption = {
            animation: Constants.ENABLE_CHART_ANIMATION
        };

        return options;
    }

    loading() {
        this.message = 'Loading... ';
        this.componentLoading = true;
    }

    loadingError() {
        this.message = 'Error loading data';
        this.componentLoading = false;
    }

    loadingDone(hasData: boolean) {
        this.message = hasData ? 'Almost done.' : 'No data available';
        this.setStateForReport(this.componentId, true);
        this.componentLoading = false;
    }

    getFormattedTooltipText(params: any, issueId: any, issueName: any) {
        var tooltip = '<div style="width:320px;white-space:normal;">' + issueId + ": " + issueName + "<br/>";

        for (var i = 0; i < params.length; i++) {
            tooltip += params[i].marker + params[i].seriesName + ": ";
            tooltip += params[i].value || "0";
            tooltip += "<br/>";
        }

        return tooltip + "</div>";
    }

    // TODO: Remove this or the above redundant function after issue analysis becomes defacto component for issues analysis
    getFormattedTooltipTextForIssueAnalysis(params: any, issue: ParentIssueDataModel) {
        const issueTypeHtml = '<span style="background-color: #929397;border-radius:7px;color:white;padding:4px;margin-right: 5px;margin-bottom: 5px;height:fit-content;width:fit-content">' + issue.issueType.name + '</span>'
        const issueNameDesc = '<span>' + " " + issue.id + ": " + issue.name + '</span>'
        const tooltipHeader = '<div style="display:flex;flex-direction:column;">' + issueTypeHtml + issueNameDesc + '</div>'
        var tooltip = '<div style="width:320px;white-space:normal;padding:5px;">' + tooltipHeader;

        for (var i = 0; i < params.length; i++) {
            tooltip += params[i].marker + params[i].seriesName + ": ";
            tooltip += params[i].value || "0";
            tooltip += "<br/>";
        }

        return tooltip + "</div>";
    }

    getTitle() {
        return {
            left: '',
            x: '-0.2%',
            y: '89%',
            subtextStyle: {
                fontSize: 16,
                fontWeight: <any>'lighter',
            }
        };
    }

    sumOfLegendsArray(arrayOfData: any[]) {
        let sum = arrayOfData.reduce((accumulator: number, current: number) => accumulator + current, 0);
        sum = sum.toFixed(2);
        sum = sum == 0.00 ? 0 : sum;
        return sum;
    }

    ngOnDestroy() {
        this.subscription.unsubscribe();
    }

    /**
   * Check weather value if 0 or not.
   * @param value {number} value of pie chart slice
   * @returns Graph data value
   */
    checkValueOfObjectIsNull(value: number) {
        if (value != null) {
            let graphValue = value == 0 ? '' : value;
            return graphValue;
        }
    }
}
