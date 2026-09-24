/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { Component, Input } from '@angular/core';
import { Constants } from 'app/constants';

@Component({
  selector: 'khoji-timelog-rag',
  template: `<div class="ragContainer" [ngStyle]="{'background-color':backgroundColor}" [style.color]="color" [style.padding]="padding" [style.fontSize]="fontSize">
                 <ng-container  *ngIf="(type === 'team'); else memberRag" > {{value | number : '1.2-2'}}% </ng-container>
             </div>
             <ng-template #memberRag> {{value}} </ng-template>`,

  styles: ['.ragContainer { min-width: 30px;max-width: 60px;text-align:center;border-radius:5px;color:white;margin:2px; white-space: nowrap; }']
})
export class TimelogRagComponent {

  @Input() value: number;
  @Input() backgroundColor: string;
  @Input() type: string;
  @Input() color:string = Constants.WHITE_COLOR_CODE;
  @Input() padding:string = '2px';
  @Input() fontSize:string = 'inherit';
}
