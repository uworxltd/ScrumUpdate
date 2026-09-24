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

const env: Partial<typeof commonEnvironment> = {
  //Overriden properties
  //mock: true,
  //mockCurrentDate: '24/12/2021',
  //KHOJI_FAQ_PAGE: 'http://localhost:8888/khoji/help',
  //KHOJI_CLASSIC_ADMIN_PAGE: 'http://localhost:8888/angular-app/#/admin?username=',
  REQUEST_PANEL_VISIBILITY: "false",
  COMPONENT_SETTINGS_ENABLED: "true",
  TRACKING_PROVIDER: "MOCK",
}

const mockEnvironment = {
  //Environment specifc properties
  QUICK_SEARCH_LAST_COMMON_SEARCHES: "20",
  LINKED_STORY_ATTRIBUTES_URL_CONFIG: { "epicId": "epicURL", "id": "issueURL" },
  SOURCE_ISSUE_CATEGORIES_API: '/source/categoryconfigs',
}

export const environment = {
  ...commonEnvironment,
  ...env,
  ...mockEnvironment
};
