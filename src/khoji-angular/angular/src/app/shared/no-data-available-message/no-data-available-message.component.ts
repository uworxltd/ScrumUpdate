/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { Component, Input, OnInit } from '@angular/core';
import { Constants } from "app/constants";

@Component({
  selector: 'app-no-data-available-message',
  templateUrl: './no-data-available-message.component.html',
  styleUrls: ['./no-data-available-message.component.css']
})
export class NoDataAvailableMessageComponent implements OnInit {

  @Input() noDataAvailableMessage;
  @Input() tooltipType = 'info';

  constructor() { }

  ngOnInit(): void {
  }

}
