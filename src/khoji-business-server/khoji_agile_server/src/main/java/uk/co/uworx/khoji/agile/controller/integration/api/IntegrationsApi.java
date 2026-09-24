package uk.co.uworx.khoji.agile.controller.integration.api;

import io.swagger.v3.oas.annotations.Operation;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.security.Principal;

public interface IntegrationsApi
{
  @Operation(summary = "Perform Oauth with Microsoft Identity and save tokens")
  @GetMapping(
          value = "/ms-calendar/auth",
          produces = MediaType.APPLICATION_JSON_VALUE
  )
  public ResponseEntity<HttpStatus> doMSAuth(@RequestParam String accessCode, Principal principal);

}
