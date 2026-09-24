/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import { environment } from 'environments/environment';
import { NgcCookieConsentConfig } from 'ngx-cookieconsent';

export const cookieConfig: NgcCookieConsentConfig = {
  cookie: {
    domain: environment.SERVER_NAME // it is recommended to set your domain, for cookies to work properly
  },
  position: "bottom-left",
  palette: {
    popup: {
      background: '#ffffff',
      text: "#000000",
      link: "#256477",
      border: "gray"
    },
    button: {
      background: '#256477',
      text: "#ffffff",
      border: "transparent",
    }
  },
  theme: 'classic',
  type: 'opt-out',
  layout: 'my-custom-layout',
  layouts: {
    'my-custom-layout': '{{messagelink}}{{compliance}}'
  },
  elements: {
    messagelink: `
      <span id="cookieconsent:desc" class="cc-message">{{message}} 
        <a aria-label="Learn more about cookies" tabindex="0" class="cc-link" href="{{cookiePolicyHref}}" target="_blank" rel="noopener">{{cookiePolicyLink}}</a>
      </span>
      `
  },
  content: {
    message: 'Our website uses cookies to enhance your experience, analyze site traffic and serve tailored content as specified in',
    allow: "Accept All",
    deny: "Accept Necessary",
    cookiePolicyLink: 'Cookie Policy',
    cookiePolicyHref: 'https://www.scrumupdate.com/privacy-policy.html',
  }
};
