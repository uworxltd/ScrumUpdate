
import { Injectable } from "@angular/core";
import { NgxSpinnerService } from "ngx-spinner";

/**
  * Displayes a spinner with overlay.
  * @usageNotes Include spinner UI directive <khoji-spinner [fullScreen]="true"></khoji-spinner> in the top most parent component.
  * Show spinner in the beginner of API request. Hide spinner immediately in case of error in catchError operator.
  * Finally hide spinner with a timeout (i.e 3000ms) when request is resolved.
  * Spinner service keeps internal state. A count variable is increased by 1 each time .show() method is called
  * and it is decreased by 1 each time .hide() method is called. Spinner keeps showing until count reaches zero.
*/
@Injectable({
  providedIn: 'root'
})
export class KhojiSpinnerService {
  counter = 0;
  constructor(private spinner: NgxSpinnerService) { }

  show() {
    this.counter += 1;

    if (this.counter === 1) {
      this.spinner.show();
    }
  }
  
  hide() {
    this.counter -= 1;
    
    if (this.counter < 0) this.counter = 0;
    
    if (this.counter === 0) {
      this.spinner.hide();
    }
  }

  hideAll() {
    this.counter = 0;
    this.spinner.hide();
  }
}
