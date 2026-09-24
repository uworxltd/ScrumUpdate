/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { Action, createReducer, on } from '@ngrx/store';
import { GlobalTranslations } from './app-states';
import { setTranslations } from './app.actions';

const globalTranslations: GlobalTranslations = {
  translation: undefined
};

const _globalTranslationsReducer = createReducer(
  globalTranslations,
  on(setTranslations, (state, { translation }) => ({ ...state, translation: translation }))
);

export function globalTranslationsReducer(state: GlobalTranslations, action: Action) {
  return _globalTranslationsReducer(state, action);
}
