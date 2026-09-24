/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/



import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'khoji-tooltip-icon',
  templateUrl: './tooltip-icon.component.html',
  styleUrls: ['./tooltip-icon.component.css']
})
export class TooltipIconComponent implements OnInit {

  @Input() tooltipText: string;
  @Input() inheritColor: boolean = false;
  @Input() toolTipPosition: string = "top";
  @Input() toolTipType: string = "default";

  constructor() { }

  ngOnInit(): void {
  }

}
