/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { catchError, concatMap, map, mergeMap, withLatestFrom } from 'rxjs/operators';
import { fetchError, fetchTranslations, setTranslations } from './app.actions';
import { selectTranslationRaw } from './global-translations.selector';
import { environment } from 'environments/environment';

@Injectable()
export class TranslationEffects {
  translationEffect$ = createEffect(() => this.actions$.pipe(
    ofType(fetchTranslations),
    concatMap(action => of(action).pipe(withLatestFrom(this.store.pipe(selectTranslationRaw)))),
    mergeMap(([action, trans]) => this.fetch(action, trans).pipe(map(res => this.dispatch(action, res)))),
  ));

  constructor(
    private http: HttpClient,
    private actions$: Actions,
    private store: Store
  ) { }

  fetch(action: any, trans: any) {
    const { locale } = action;

    if (trans && trans.locale === locale) return of(trans);

    const url = `./assets/config/translations/${locale}-translations.json?v=${environment.VERSION}`;
    
    return this.http.get(url)
      .pipe(catchError((error) => {
        return of(this.store.dispatch(fetchError()));
      }));
  }

  dispatch(action: any, response: any) {

    if (response === undefined) {
      return fetchError();
    }

    const { locale } = action;

    return setTranslations({ translation: { ...response, locale } });
  }
}
