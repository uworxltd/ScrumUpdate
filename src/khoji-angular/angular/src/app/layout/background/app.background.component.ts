/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { Component } from '@angular/core';
import { LayoutService } from '../service/app.layout.service';

@Component({
    selector: 'app-background',
    templateUrl: './app.background.component.html',
})
export class AppBackgroundComponent {

    constructor(private layoutService: LayoutService) {}

    get dark(): boolean {
		return this.layoutService.config.colorScheme !== 'light';
	}

}
