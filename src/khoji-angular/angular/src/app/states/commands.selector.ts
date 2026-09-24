/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { createSelector, select } from "@ngrx/store";
import { pipe } from "rxjs";
import { AppCommands, AppState } from "./app-states";

const addNewUserCommandSelector = createSelector(
  (state: AppState) => state.commands,
  (commands: AppCommands) => commands.addNewUser
);

export const selectAddNewUserCommand = pipe(
  select(addNewUserCommandSelector),
);
