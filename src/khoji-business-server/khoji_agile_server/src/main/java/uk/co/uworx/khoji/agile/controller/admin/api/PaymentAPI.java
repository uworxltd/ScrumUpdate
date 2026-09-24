/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.controller.admin.api;

import io.swagger.v3.oas.annotations.Operation;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import uk.co.uworx.khoji.agile.controller.admin.PaymentAPIImpl;

@CrossOrigin
@RequestMapping("/payment")
public interface PaymentAPI
{
  /**
   * API to fetch hosted page.
   *
   * @return hosted page
   */
  @Operation(summary = "Fetch hosted page")
  @GetMapping("/hosted-page")
  ResponseEntity<Object> getPaymentHostedPage();

  /**
   * API to fetch hosted page
   * for tenant admin
   *
   * @return hosted page
   */
  @Operation(summary = "Fetch hosted page for tenant admin")
  @GetMapping("/signup/hosted-page")
  ResponseEntity<Void> getPaymentHostedPageForTenantAdmin(@RequestParam String code);
}
