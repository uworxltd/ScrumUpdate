/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class HTTPClientService {
  constructor(private http: HttpClient) {
  }

  getHttpClient(): any {
    return this.http;
  }

}
