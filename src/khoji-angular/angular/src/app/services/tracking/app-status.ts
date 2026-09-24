/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


  import { buildPathRec } from "./helper-functions";

  const appStatus = {
    Team_Worklog_Analysis : {
        No_Data : {}
    }
  };

  export const AppStatus = buildPathRec(appStatus);
