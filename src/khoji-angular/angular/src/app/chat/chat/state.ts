import { Injectable } from "@angular/core";
import { Actions, createEffect, ofType } from "@ngrx/effects";
import { Action, createAction, createReducer, createSelector, on, props, select, Store } from "@ngrx/store";
import { HttpService } from "app/services/common/http.service";
import { AppState, LoadingState } from "app/states/app-states";
import { environment } from "environments/environment";
import { MessageService } from "primeng/api";
import { of, pipe } from "rxjs";
import { catchError, concatMap, map, mergeMap, withLatestFrom } from "rxjs/operators";
import { v4 } from "uuid";

// State
export interface ChatBotState {
    conversationId: string;
    instanceId: number;
    userId: number;
    sprintId: number;
    messages: ChatBotMessage[];
    loadingState: LoadingState;
}

export interface ChatBotMessage {
    id: string;
    text: string;
    type: 'card' | 'data' | 'text' | 'action';
    sender: 'bot' | 'user';
    /** available with type card */
    actions?: ChatBotMessageAction[];
    /** available with type data */
    data?: Map<string, string>;
}

export interface ChatBotMessageAction {
    type: 'button';
    label: string;
    value: string;
}

// Actions
export const startConversation = createAction('[ChatBot] StartConversation', props<{ instanceId: number; userId: number; sprintId: number; }>());
export const setConversationState = createAction('[ChatBot] SetConversationState', props<{ chatBotState: ChatBotState }>());
export const resetConversationState = createAction('[ChatBot] ReSetConversationState');
export const sendMessage = createAction('[ChatBot] SendMessage', props<{ text: string; messageType: 'text' | 'action' }>());
export const addMessage = createAction('[ChatBot] AddMessage', props<{ message: ChatBotMessage; }>());
export const setLoadingState = createAction('[ChatBot] SetLoadingState', props<{ loadingState: LoadingState }>());

// Reducer
const state: ChatBotState = {
    conversationId: '',
    instanceId: 0,
    userId: 0,
    sprintId: 0,
    messages: [],
    loadingState: LoadingState.Pending,
};

const reducer = createReducer(
    state,
    on(setConversationState, (state, { chatBotState }) => chatBotState),
    on(resetConversationState, (state) => state),
    on(setLoadingState, (state, { loadingState }) => ({ ...state, loadingState })),
    on(addMessage, (state, { message }) => ({ ...state, messages: [...state.messages, message] })),
);

export function chatBotStateReducer(state: ChatBotState, action: Action) {
    return reducer(state, action);
}

// Selectors
const sprintAnalyticsCurrentSprintSelector = createSelector(
    (state: AppState) => state,
    (state) => state.sprintAnalyticsState?.proactiveSprints?.find(s => s.sprint_name === state.sprintAnalyticsState?.sprintAnalytics?.meta?.sprintName)
);

export const selectSprintAnalyticsCurrentSprint = pipe(
    select(sprintAnalyticsCurrentSprintSelector),
);

const chatBotStateSelector = createSelector(
    (state: AppState) => state,
    (state) => state.chatBotState
);

export const selectChatBotState = pipe(
    select(chatBotStateSelector),
);

const loadingStateSelector = createSelector(
    chatBotStateSelector,
    (state) => state.loadingState
);

export const selectLoadingState = pipe(
    select(loadingStateSelector),
);

// Effects
@Injectable()
export class ChatBotEffects {
    constructor(
        private actions$: Actions,
        private httpService: HttpService,
        private messageService: MessageService,
        private store: Store,
    ) { }

    // Effect for fetching khoji configs
    startConversationEffect$ = createEffect(() => this.actions$.pipe(
        ofType(startConversation),
        concatMap(action => of(action).pipe(withLatestFrom(this.store.pipe(selectChatBotState)))),
        mergeMap(([action, state]) => this.startConversation(action, state).pipe(map(res => this.dispatchStartConversation(res))))
    ));

    startConversation(action, state: ChatBotState) {
        const { instanceId, userId, sprintId } = action;
        const url = `${environment.CHAT_BOT}/${instanceId}/user/${userId}/sprint/${sprintId}`;

        this.store.dispatch(setLoadingState({ loadingState: LoadingState.Loading }));

        return this.httpService.appPutRequest(url, null)
            .pipe(catchError((error) => {
                return of(this.store.dispatch(setLoadingState({ loadingState: LoadingState.Error })));
            }));
    }

    dispatchStartConversation(response) {
        if (response === undefined) {
            return setLoadingState({ loadingState: LoadingState.Error });
        }

        this.store.dispatch(setLoadingState({ loadingState: LoadingState.Done }));
        return setConversationState({ chatBotState: response });
    }

    sendMessageEffect$ = createEffect(() => this.actions$.pipe(
        ofType(sendMessage),
        concatMap(action => of(action).pipe(withLatestFrom(this.store.pipe(selectChatBotState)))),
        mergeMap(([action, state]) => this.sendMessage(action, state).pipe(map(res => this.dispatchSendMessage(res))))
    ));

    sendMessage(action, state: ChatBotState) {
        const { text, messageType } = action;
        const { instanceId, userId, conversationId } = state;

        const url = `${environment.CHAT_BOT}/${instanceId}/user/${userId}/conversation/${conversationId}`;

        this.store.dispatch(setLoadingState({ loadingState: LoadingState.Loading }));

        if (messageType === 'text') {
            this.store.dispatch(addMessage({
                message: {
                    id: v4(),
                    sender: 'user',
                    type: 'text',
                    text
                }
            }));
        }

        return this.httpService.appPostRequest(url, { type: 'text', text })
            .pipe(catchError((error) => {
                return of(this.store.dispatch(setLoadingState({ loadingState: LoadingState.Error })));
            }));
    }

    dispatchSendMessage(response) {
        if (response === undefined) {
            return setLoadingState({ loadingState: LoadingState.Error });
        }

        this.store.dispatch(setLoadingState({ loadingState: LoadingState.Done }));
        return addMessage({ message: response });
    }
}