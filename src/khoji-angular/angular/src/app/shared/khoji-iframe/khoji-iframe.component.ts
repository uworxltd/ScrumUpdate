/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';


@Component({
  selector: 'khoji-iframe',
  templateUrl: './khoji-iframe.component.html',
})

export class KhojiIframeComponent implements OnInit {
  @ViewChild('iframe') iframe: any;
  @Input() url: string;
  sanitizedUrl: any;
  @Output() isIframeLoaded = new EventEmitter<boolean>();

  constructor(private sanitizer: DomSanitizer) { }

  ngOnInit(): void {
    this.sanitizedUrl= this.sanitizer.bypassSecurityTrustResourceUrl(this.url);
  }

  onIframeLoad() {
    this.isIframeLoaded.emit(true);
 }
}
