/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

// The file contents for the current environment will overwrite these during build.
// The build system defaults to the dev environment which uses `environment.ts`, but if you do
// `ng build --env=prod` then `environment.prod.ts` will be used instead.
// The list of which env maps to which file can be found in `.angular-cli.json`.

import { commonEnvironment } from "./environment.common"

const env: Partial<typeof commonEnvironment> ={
  //Overridden properties
}

const envExtras = {
  //Environment specific properties
}

export const environment = {
  ...commonEnvironment,
  ...env,
  ...envExtras
}

