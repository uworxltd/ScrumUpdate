/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { DropdownsModule } from './dropdowns.module';

describe('DropdownsModule', () => {
  let dropdownsModule: DropdownsModule;

  beforeEach(() => {
    dropdownsModule = new DropdownsModule();
  });

  it('should create an instance', () => {
    expect(dropdownsModule).toBeTruthy();
  });
});
