/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { OnInit, Injectable } from '@angular/core';
import { Constants } from 'app/constants';
import { AppState } from '../../states/app-states';
import { Store } from '@ngrx/store';
import { paymnetSuccessful, resetPaymentHostedObject } from '../../states/app.actions';
import { closedPaymentPopup } from 'app/states/app.actions';
import { KhojiSpinnerService } from 'app/services/spinner.service';

@Injectable()
export class chargeBeeService implements OnInit {

  modalOpened = false;

  constructor(private spinner: KhojiSpinnerService, private store: Store<AppState>) { }

  ngOnInit(): void {
  }

  /**
    * Verify if the key of first index of hosted page object
    * is portal session or checkout
    */
  openManageSubscriptonModal(paymentSite: string, hostedPageObject: any) {
    if(this.modalOpened) {
      return;
    }

    if (Object.keys(hostedPageObject)[0] == Constants.PAYMENT_PORTAL_SESSION_PAGE) {
      this.modalOpened = true;
      this.showPaymentPortalSessionPage(paymentSite, hostedPageObject);
    } else if (Object.keys(hostedPageObject)[0] == Constants.PAYMENT_CHECKOUT_PAGE) {
      this.modalOpened = true;
      this.showPaymentCheckoutPage(paymentSite, hostedPageObject);
    }
  }


  /**
    * Chargebee specific method
    */
  showPaymentCheckoutPage(paymentSite: string, hostedPageObject: any): void {
    this.store.dispatch(closedPaymentPopup({ popupClosed: false}));
    const cbInstance = window['Chargebee'].init({ site: paymentSite });
    cbInstance.openCheckout({
      hostedPage: () => {
        return new Promise((resolve, reject) => {
          if (hostedPageObject == null) {
            reject();
          }
          else {
            this.spinner.show();
            resolve(Object.values(hostedPageObject)[0]);
          }
        });
      },
      close: () => {
        this.store.dispatch(resetPaymentHostedObject());
        this.spinner.hide()
        setTimeout(() => this.modalOpened = false, 100);
      },
      success: () => {
        this.store.dispatch(paymnetSuccessful({ successfulPayment: true}));
        this.spinner.hide()
        setTimeout(() => this.modalOpened = false, 100);
      }
    });
  }

  /**
    * Chargebee specific method
    */
  showPaymentPortalSessionPage(paymentSite: string, hostedPageObject: any): void {
    const cbInstance = window['Chargebee'].init({ site: paymentSite });
    cbInstance.setPortalSession(() => new Promise((resolve, reject) => {
      if (hostedPageObject == null) {
        reject();
      }
      else {
        resolve(Object.values(hostedPageObject)[0]);
      }
    }));
    cbInstance.createChargebeePortal().open({

      close: () => {
        this.store.dispatch(paymnetSuccessful({ successfulPayment: true}));
        this.store.dispatch(resetPaymentHostedObject());
        setTimeout(() => this.modalOpened = false, 100);
      },
    });
  }

  closeHostedPage(paymentSite: string)
  {
    if (!window['Chargebee'].inited) {
      return;
    }
    const cbInstance = window['Chargebee'].init({ site: paymentSite });
    cbInstance.closeAll();
  }
}
