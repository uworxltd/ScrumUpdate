import { Component, EventEmitter, Input, Output, TemplateRef } from '@angular/core';


export interface KhojiChipsModel {
  id: number | string;
  label: string;
  tooltip?: TemplateRef<any> | string;
  tooltipTemplateContent?: any;
  selected?: boolean;
}

@Component({
  selector: 'khoji-chip',
  templateUrl: './chips.component.html',
  styleUrls: ['./chips.component.scss']
})
export class ChipsComponent {

  @Input() chip: KhojiChipsModel;
  @Output() chipClick = new EventEmitter<KhojiChipsModel>();


  onChipClick(chip: KhojiChipsModel) {
    this.chipClick.emit(chip);
  }

  isTemplateRef(value: any): value is TemplateRef<any> {
    return value instanceof TemplateRef;
  }

}
