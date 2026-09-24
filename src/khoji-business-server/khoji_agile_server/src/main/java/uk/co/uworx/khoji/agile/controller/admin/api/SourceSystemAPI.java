/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.controller.admin.api;

import io.swagger.v3.oas.annotations.Operation;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import uk.co.uworx.khoji.agile.internal.datamodel.KhojiIssueType;
import uk.co.uworx.khoji.agile.internal.model.SourceSystem;
import uk.co.uworx.khoji.agile.legacy.models.SourceUser;

import java.security.Principal;
import java.util.List;

@CrossOrigin
public interface SourceSystemAPI
{
  @Operation(summary = "Get Source User")
  @PostMapping(value = "/source/users")
  List<SourceUser> getSourceUsers(
          @RequestHeader("username") String username,
          @RequestHeader(value = "clientip", required = false) String clientIp,
          @RequestBody(required = false) SourceSystem sourceSystem,
          Principal principal
  );

  @Operation(summary = "Get Issue Types")
  @GetMapping(value = "/source/issuetype")
  List<KhojiIssueType> getIssueTypes(
          @RequestHeader(value = "username", required = false) String username,
          @RequestHeader(value = "clientip", required = false) String clientIp,
          Principal principal
  );
}
