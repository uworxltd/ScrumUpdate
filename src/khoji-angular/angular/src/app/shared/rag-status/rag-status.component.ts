import { LabelType, Options } from '@angular-slider/ngx-slider';
import { Component, EventEmitter, HostBinding, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { DomSanitizer, SafeStyle } from '@angular/platform-browser';
import { Store } from '@ngrx/store';
import { AppState, UserAccessLevelsStatus } from 'app/states/app-states';
import { selectTranslation } from 'app/states/global-translations.selector';
import { Subscription } from 'rxjs';
import { parseParametrizedString } from '../helper-functions';
import { AdminActions, TrackingService } from 'app/services/tracking';
import { selectAccessLevelsStatus } from 'app/user-profile/state/user-profile.selectors';

interface FieldState {
  class: string;
  message: string;
  inError: boolean;
}

@Component({
  selector: 'khoji-rag-status',
  templateUrl: './rag-status.component.html',
  styleUrls: ['./rag-status.component.scss']
})
export class RagStatusComponent implements OnInit, OnChanges {
  value: number;
  highValue: number;
  inputFieldLowValue: number;
  inputFieldHighValue: number;
  rangeDiff = 0.01;
  showSlider = false;

  private subscription = new Subscription();
  translation: any;
  private previousHigh: number;
  private previousLow: number;

  options: Options;
  private sliderDelay: any;

  fieldStateRed: FieldState = { class: '', message: '', inError: false };
  fieldStateAmber: FieldState = { class: '', message: '', inError: false };
  accessLevelsStatus: UserAccessLevelsStatus;

  @Input() ragColors;
  @Input() showAboveText = true;
  @Input() ragThresholds;
  @Input() sliderConfigs;
  @Input() ragStatusHeading;
  @Input() showRangeContainer = true;
  @Input() showSpinner = false;
  @Input() showSkeletalLoading: boolean = false;

  @Output() sliderValueChanges = new EventEmitter<string>();
  @Output() inError = new EventEmitter<boolean>();

  @HostBinding('style') style: SafeStyle;
  private selectedStyle: string;

  constructor(private store: Store<AppState>, private sanitizer: DomSanitizer, private trackingService: TrackingService) {}

  clear() {
    this.inputFieldLowValue = this.value = this.previousLow = Number(this.sliderConfigs?.isRedStartingColor ? this.ragThresholds?.Medium : this.ragThresholds?.Normal);
    this.inputFieldHighValue = this.highValue = this.previousHigh = Number(this.sliderConfigs?.isRedStartingColor ? this.ragThresholds?.Normal : this.ragThresholds?.Medium);
    this.inError.emit(false);
    this.resetFieldState(this.fieldStateAmber);
    this.resetFieldState(this.fieldStateRed);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (!this.showSpinner) {
      this.clear();
      this.ngOnDestroy();
      this.ngOnInit();
    }
  }

  ngOnInit(): void {
    const accessLevelsStatus$ = this.store.pipe(selectAccessLevelsStatus);

    this.subscription.add(
      this.store.pipe(selectTranslation).subscribe((translation) => {
        this.translation = translation;
      })
    );

    this.subscription.add(accessLevelsStatus$.subscribe((data) => (this.accessLevelsStatus = data)));

    this.initializeSliderOptions();

    if (!this.showSpinner) {
      this.applySelectedStyle();
      this.setupSliderDisplayDelay();
    }
  }

  private initializeSliderOptions() {
    this.options = {
      floor: 0,
      ceil: 100,
      showTicksValues: true,
      showTicks: true,
      boundPointerLabels: true,
      minLimit: 0,
      maxLimit: 99.99,
      minRange: 0.01,
      step: 0.01,
      tickStep: 25,
      showOuterSelectionBars: true,
      animate: false,
      translate: (value: number, label: LabelType): string => {
        switch (label) {
          case LabelType.Low:
            return `${value}<span style="font-size:12px">%</span>`;
          case LabelType.High:
            return `${value}<span style="font-size:12px">%</span>`;
          default:
            return `${value}%`;
        }
      },
      combineLabels: (minLabel, maxLabel): string => {
        return `<span>${minLabel}&nbsp;&nbsp;&nbsp;&nbsp;${maxLabel}</span>`;
      }
    };
  }

  private applySelectedStyle() {
    this.selectedStyle = `
      --startingColor: ${Boolean(this.sliderConfigs?.isRedStartingColor) ? this.ragColors?.RED : this.ragColors?.GREEN};
      --middleColor: ${this.ragColors?.AMBER};
      --endingColor: ${Boolean(this.sliderConfigs?.isRedStartingColor) ? this.ragColors?.GREEN : this.ragColors?.RED}
    `;
    this.style = this.sanitizer.bypassSecurityTrustStyle(this.selectedStyle);
  }

  private setupSliderDisplayDelay() {
    this.sliderDelay = setTimeout(() => {
      this.showSlider = true;
    }, 500);
  }

  getUpdatedRagThreshold() {
    const ragThreshold = { ...this.ragThresholds };
    ragThreshold.Normal = this.inputFieldHighValue = this.previousHigh = this.toFixedDecimal(this.highValue);
    ragThreshold.Medium = this.inputFieldLowValue = this.previousLow = this.toFixedDecimal(this.value);
    return JSON.stringify(ragThreshold);
  }

  handleHighValueField(event) {
    this.resetFieldState(this.fieldStateAmber);

    if (event !== null && event !== undefined) {
      if (event <= this.value) {
        this.populateFieldState(this.fieldStateAmber, "Amber's value cannot be below %s1%");
      } else if (event >= 100) {
        this.populateFieldState(this.fieldStateAmber, "Amber's value can go up to 99.99%");
      } else {
        this.inputFieldHighValue = this.previousHigh = this.highValue = event;
        if (!this.fieldStateAmber.inError && !this.fieldStateRed.inError) this.handleChange(true);
      }
    } else {
      // Allow empty while editing; block save until a valid value is entered
      this.populateFieldState(this.fieldStateAmber, "Amber's value is required");
    }
  }

  handleLowValueField(event) {
    this.trackingService.captureUserAction(AdminActions.WorklogRAGSettingsTab.RangeUpdatedFromInputField);
    this.resetFieldState(this.fieldStateRed);
    if (event !== null && event !== undefined) {
      if (event >= this.highValue) {
        this.populateFieldState(this.fieldStateRed, `${this.sliderConfigs?.isRedStartingColor ? "Red's" : "Green's"} value can go up to %s1%`);
      } else {
        this.inputFieldLowValue = this.previousLow = this.value = event;
        if (!this.fieldStateAmber.inError && !this.fieldStateRed.inError) this.handleChange(true);
      }
    } else {
      // Allow empty while editing; block save until a valid value is entered
      this.populateFieldState(this.fieldStateRed, `${this.sliderConfigs?.isRedStartingColor ? "Red's" : "Green's"} value is required`);
    }
  }

  private resetHighFieldValue() {
    setTimeout(() => {
      this.inputFieldHighValue = this.highValue = this.previousHigh + this.rangeDiff / 100;
    }, 0);
  }

  private resetLowFieldValue() {
    setTimeout(() => {
      this.inputFieldLowValue = this.value = this.previousLow + this.rangeDiff / 100;
    }, 0);
  }

  private populateFieldState(fieldState: FieldState, message: string) {
    fieldState.class = 'ng-invalid';
    fieldState.message = message;
    fieldState.inError = true;
    this.inError.emit(true);
  }

  handleChange(isChangedFromInputField = false) {
    if (!this.accessLevelsStatus.hasAdminAccess) return;
    if (!isChangedFromInputField) {
      this.trackingService.captureUserAction(AdminActions.WorklogRAGSettingsTab.SliderChanged);
    }
    this.resetFieldState(this.fieldStateAmber);
    this.resetFieldState(this.fieldStateRed);
    this.sliderValueChanges.emit(this.getUpdatedRagThreshold());
    this.inError.emit(false);
  }

  private toFixedDecimal(value: number) {
    if (value === null) return null;
    return Number(value.toFixed(2));
  }

  ngOnDestroy() {
    clearTimeout(this.sliderDelay);
    this.subscription.unsubscribe();
  }

  private resetFieldState(fieldState: FieldState) {
    fieldState.class = '';
    fieldState.message = '';
    fieldState.inError = false;
  }

  private parseParameterizedString(parameterizedString: string, value: number) {
    return parseParametrizedString(parameterizedString, this.toFixedDecimal(value));
  }

  getSkeletalLoadingHeight(): string {
    if (this.showSpinner && this.showRangeContainer) return '318px';
    if (!this.showSlider || (!this.showRangeContainer && this.showSpinner)) return '53px';
    return '';
  }
}
