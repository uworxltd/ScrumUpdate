import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'khoji-open-modal-icon',
  templateUrl: './open-modal-icon.component.html',
  styleUrls: ['./open-modal-icon.component.css']
})
export class OpenModalIconComponent implements OnInit {
  @Input() tooltipText: string;
  @Input() inheritColor: boolean = false;
  constructor() { }

  ngOnInit(): void {
  }

}
