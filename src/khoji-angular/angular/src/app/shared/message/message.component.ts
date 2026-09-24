import { Component, Input } from '@angular/core';

@Component({
  selector: 'khoji-message',
  templateUrl: './message.component.html',
  styleUrls: ['./message.component.scss']
})
export class MessageComponent {
  @Input() message: string;
  @Input() addSpinner: boolean = false;
}