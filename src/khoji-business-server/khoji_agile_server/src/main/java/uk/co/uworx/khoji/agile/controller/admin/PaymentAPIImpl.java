/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.controller.admin;

import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.RestController;
import uk.co.uworx.khoji.agile.controller.admin.api.PaymentAPI;
import uk.co.uworx.khoji.agile.internal.helper.SecurityAccessLevel;
import uk.co.uworx.khoji.security.annotations.HasAccessToInstanceWithPrivilege;

@RestController
@Tag(name = "Khoji For Agile", description = "Operation to fetch Hosted pages in Khoji For Agile")
@Validated
public class PaymentAPIImpl implements PaymentAPI
{
  private static final String HOSTED_PAGE_UNAVAILABLE = "Payment hosted pages are no longer available.";

  /**
   * The hosted-page billing feature was removed with KBP. The endpoint is kept
   * so clients receive a clear error instead of a null 200 response.
   *
   * @return 404 with an explanatory message
   */
  @Override
  public ResponseEntity<Object> getPaymentHostedPage()
  {
    return new ResponseEntity<>(HOSTED_PAGE_UNAVAILABLE, HttpStatus.NOT_FOUND);
  }

  /**
   * The hosted-page billing feature was removed with KBP. The endpoint is kept
   * so clients receive a clear error instead of a null 200 response.
   *
   * @return 404
   */
  @Override
  @HasAccessToInstanceWithPrivilege(
          privileges = {
                  SecurityAccessLevel.TENANT_ADMIN
          }
  )
  public ResponseEntity<Void> getPaymentHostedPageForTenantAdmin(String code)
  {
    return new ResponseEntity<>(HttpStatus.NOT_FOUND);
  }
}
