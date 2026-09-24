/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.controller.stats;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import lombok.extern.log4j.Log4j2;
import org.apache.camel.ProducerTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import uk.co.uworx.khoji.agile.config.EmailConfig;
import uk.co.uworx.khoji.agile.context.BootApplicationContextProvider;
import uk.co.uworx.khoji.agile.handler.ConfigHandler;
import uk.co.uworx.khoji.agile.handler.VelocityTemplateHandler;
import uk.co.uworx.khoji.agile.internal.model.EmailModel;
import uk.co.uworx.khoji.agile.persistence.model.Instance;
import uk.co.uworx.khoji.agile.persistence.service.InstanceDataService;
import uk.co.uworx.khoji.agile.service.AdminService;
import uk.co.uworx.khoji.security.annotations.AuthorizationApplicationLevelAPIs;

import java.time.LocalDate;
import java.util.Optional;

import static uk.co.uworx.khoji.agile.service.AdminService.USER_HAS_BEEN_REVOKED_FROM_SCRUM_UPDATE_SUBJECT;
import static uk.co.uworx.khoji.agile.service.AdminService.USER_INVITE_SUBJECT;

@CrossOrigin
@RestController
@Profile("dev")
@RequestMapping("/email")
@Log4j2
public class EmailController
{
  public static final String DATE_FROM = "dateFrom";
  public static final String TO_DATE = "toDate";
  public static final String USER_NAME = "userName";
  public static final String FREQUENCY = "frequency";
  @Autowired
  private AdminService adminService;
  @Autowired
  private ProducerTemplate template;
  @Autowired
  private ConfigHandler configHandler;
  @Autowired
  private VelocityTemplateHandler velocityTemplateHandler;
  @Autowired
  private ProducerTemplate producerTemplate;
  @Autowired
  private EmailConfig emailConfig;
  @Autowired
  private InstanceDataService instanceDataService;
  public static final String DIRECT_SWAGGER_CAMEL_ROUTE = "direct:SwaggerEmailRoute";

  //ONLY TO BE USED FOR DEVELOPMENT PURPOSES//
  @GetMapping(value = "/triggerWorklogEmail")
  @Operation(summary = "Triggers a worklog email according to user settings")
  public ResponseEntity<Object> sendEmailAccordingToUserSettings(
  )
  {
    template.asyncRequestBody(DIRECT_SWAGGER_CAMEL_ROUTE, null);
    return new ResponseEntity<>(HttpStatus.OK);
  }

  @GetMapping(value = "/triggerRevokedUserEmail")
  @AuthorizationApplicationLevelAPIs
  @Operation(summary = "Triggers email when a user is revoked")
  public ResponseEntity<Object> sendRevokedUserEmail(
          @Parameter(description = "For example: someone@example.com", required = true)
          @RequestParam String userName,
          @Parameter(description = "For example: someone@example.com", required = true)
          @RequestParam String revokedUser
  )
  {
    configHandler = BootApplicationContextProvider.getContext().getBean("configHandler", ConfigHandler.class);
    String html = velocityTemplateHandler.convertRevokedUserToEmailHTML(revokedUser, "Testing Account ID", emailConfig.khojiUrl);
    EmailModel emailModel = new EmailModel(userName, String.format(USER_HAS_BEEN_REVOKED_FROM_SCRUM_UPDATE_SUBJECT, revokedUser), html, LocalDate.now().toString(), false, adminService.getKhojiLogoImages());
    adminService.sendEmail(configHandler.jmsEmailQueue, emailModel, "Exception occurred while generating user revoked email notification for queue");
    return new ResponseEntity<>(HttpStatus.OK);
  }

  @GetMapping(value = "/triggerFirstTenantAdminEmail")
  @AuthorizationApplicationLevelAPIs
  @Operation(summary = "Triggers email when first tenant admin is invited to sign up")
  public ResponseEntity<Object> sendFirstTenantAdminEmail(
          @Parameter(description = "For example: someone@example.com", required = true)
          @RequestParam String userName,
          @Parameter(required = true)
          @RequestParam Boolean isFirstTenantAdmin
  )
  {
    Optional<Instance> instance = instanceDataService.findById(null, true);
    String instanceName = instance
            .map(Instance::getInstanceName)
            .orElse(null);

    configHandler = BootApplicationContextProvider.getContext().getBean("configHandler", ConfigHandler.class);
    String supportEmail = String.format(configHandler.supportEmail);
    String html = velocityTemplateHandler.convertInviteUserToEmailHTML(userName, null, null, isFirstTenantAdmin, supportEmail, instanceName);
    EmailModel emailModel = new EmailModel(userName, USER_INVITE_SUBJECT, html, LocalDate.now().toString(), false, adminService.getKhojiLogoImages());
    adminService.sendEmail(configHandler.jmsEmailQueue, emailModel, "Exception occured while generating user invite email notification for queue");
    return new ResponseEntity<>(HttpStatus.OK);
  }

}
