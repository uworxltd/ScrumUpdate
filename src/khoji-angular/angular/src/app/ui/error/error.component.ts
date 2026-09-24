/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'khoji-error',
  templateUrl: './error.component.html',
  styleUrls: ['./error.component.css']
})
export class ErrorComponent implements OnInit {

  errorMessage: any;
  @Input()
  set message(message: string) {
    this.errorMessage = message;
  }

  constructor() { }

  ngOnInit() {
  }
}
