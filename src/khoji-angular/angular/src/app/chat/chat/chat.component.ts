import { Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { CardModule } from 'primeng/card';
import { PanelModule } from 'primeng/panel';
import { Store } from '@ngrx/store';
import { AppState, LoadingState } from 'app/states/app-states';
import { ChatBotState, resetConversationState, selectChatBotState, selectLoadingState, selectSprintAnalyticsCurrentSprint, sendMessage, startConversation } from './state';
import { combineLatest, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { selectCurrentInstance, selectKhojiUserProfile } from 'app/user-profile/state/user-profile.selectors';
import { wait } from 'app/shared/helper-functions';
import { ScrumAssistantActions, TrackingService } from 'app/services/tracking';
import { environment } from 'environments/environment';

@Component({
  selector: 'khoji-chat',
  standalone: true,
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss'],
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
    CheckboxModule,
    InputTextModule,
    PanelModule,
  ],
})
export class ChatComponent implements OnInit, OnDestroy {
  subscription = new Subscription();
  @ViewChild('chatWindow') chatWindow: ElementRef<HTMLDivElement>;

  constructor(
    private store: Store<AppState>,
    private trackingService: TrackingService,
  ) { }

  fullScreen = false;
  chatBotState: ChatBotState;
  loadingState = LoadingState.Pending;
  LoadingState = LoadingState;

  @Input() chatNav = 'Scrum-Assistant';

  ngOnInit(): void {
    const instance$ = this.store.pipe(selectCurrentInstance);
    const profile$ = this.store.pipe(selectKhojiUserProfile);
    const sprint$ = this.store.pipe(selectSprintAnalyticsCurrentSprint, filter(sprint => !!sprint));
    const chatBotState$ = this.store.pipe(selectChatBotState);
    const loadingState$ = this.store.pipe(selectLoadingState);

    this.subscription.add(combineLatest([instance$, profile$, sprint$]).subscribe(([instance, profile, sprint]) => {
      if (instance?.id && profile?.id && sprint?.sprint_id) {
        if (environment.docker) {
          this.store.dispatch(startConversation({
            instanceId: instance.id,
            userId: profile.id,
            sprintId: sprint.sprint_id
          }));
        }
        else {
          this.store.dispatch(startConversation({
            instanceId: 3653,
            userId: 3002,
            sprintId: 364,
          }));
        }
      }
    }));

    this.subscription.add(chatBotState$.subscribe(async (data) => {
      this.chatBotState = data;

      if (data.conversationId) {
        await wait(100);
        this.scrollDownChatWindow();
      }
    }));

    this.subscription.add(loadingState$.subscribe(data => {
      this.loadingState = data;

      if (data === LoadingState.Done) {
        this.trackingService.captureUserActionResult(this.chatNav + ' / ' + ScrumAssistantActions.Chat, 'Success');
      }
      else if (data === LoadingState.Error) {
        this.trackingService.captureUserActionResult(this.chatNav + ' / ' + ScrumAssistantActions.Chat, 'Failure');
      }
    }));
  }

  sendMessage(input: HTMLInputElement | string, event?: KeyboardEvent | string) {
    const isTextBox = input instanceof HTMLInputElement;
    const isEvent = event instanceof KeyboardEvent;
    const value = isTextBox ? input.value : input;

    if ((isEvent && event.key !== 'Enter') || value.trim() === '') {
      return;
    }

    const messageType: any = !isEvent ? event : 'text';
    this.store.dispatch(sendMessage({ text: value, messageType }));
    this.trackingService.captureUserAction(this.chatNav + ' / ' + ScrumAssistantActions.Chat, { Message: value, MessageType: messageType });

    if (isTextBox) input.value = '';
  }

  scrollDownChatWindow() {
    this.chatWindow.nativeElement.scroll({ top: this.chatWindow.nativeElement.scrollHeight, behavior: 'smooth' });
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    this.store.dispatch(resetConversationState());
  }
}
