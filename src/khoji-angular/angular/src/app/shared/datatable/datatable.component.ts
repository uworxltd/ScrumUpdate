/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { Component, OnInit, AfterViewInit, ContentChild, TemplateRef, ElementRef, AfterContentInit } from '@angular/core';

@Component({
  selector: 'khoji-datatable',
  templateUrl: './datatable.component.html',
  styleUrls: ['./datatable.component.scss']
})
export class DatatableComponent implements OnInit, AfterContentInit {

  @ContentChild('table') table: HTMLTableElement;

  constructor() { }

  ngOnInit(): void {

  }

  ngAfterContentInit(): void {
  }

}
