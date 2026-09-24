package uk.co.uworx.khoji.agile.controller.integration;

import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import uk.co.uworx.khoji.agile.controller.integration.api.IntegrationsApi;
import uk.co.uworx.khoji.agile.service.business.integration.IntegrationsService;

import java.security.Principal;

@RestController
@RequestMapping("/integrations")
@Log4j2
public class IntegrationsApiImpl implements IntegrationsApi
{
  @Autowired IntegrationsService integrationsService;

  @Override
  public ResponseEntity<HttpStatus> doMSAuth(String accessCode, Principal principal)
  {
    return new ResponseEntity<>(integrationsService.fetchAndStoreMSIdentityTokens(accessCode, principal));
  }
}
