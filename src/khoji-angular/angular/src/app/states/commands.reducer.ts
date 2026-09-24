/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { Action, createReducer, on } from '@ngrx/store';
import { AppCommands } from './app-states';
import { addNewUserCommand } from './app.actions';

const commands: AppCommands = {
  addNewUser: false,
};

const _commandsReducer = createReducer(
  commands,
  on(addNewUserCommand, (state, { add }) => {
    return { ...state, addNewUser: add };
  })
);

export function commandsReducer(state: AppCommands, action: Action) {
  return _commandsReducer(state, action);
}
