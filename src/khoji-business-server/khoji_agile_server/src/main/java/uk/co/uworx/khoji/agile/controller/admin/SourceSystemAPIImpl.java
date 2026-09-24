/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.controller.admin;

import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.RestController;
import uk.co.uworx.khoji.agile.controller.admin.api.SourceSystemAPI;
import uk.co.uworx.khoji.agile.internal.datamodel.KhojiIssueType;
import uk.co.uworx.khoji.agile.internal.helper.SecurityAccessLevel;
import uk.co.uworx.khoji.agile.internal.model.SourceSystem;
import uk.co.uworx.khoji.agile.legacy.models.SourceUser;
import uk.co.uworx.khoji.agile.service.TenantService;
import uk.co.uworx.khoji.security.annotations.HasAccessToInstanceWithPrivilege;

import java.security.Principal;
import java.util.List;

@RestController
@Tag(name = "Khoji For Agile", description = "Operations to handle Project Source in Khoji For Agile")
@Validated
@Log4j2
public class SourceSystemAPIImpl implements SourceSystemAPI
{
  @Autowired
  private TenantService tenantService;

  @Override
  @HasAccessToInstanceWithPrivilege(
          privileges = {
                  SecurityAccessLevel.ADMIN
          }
  )
  public List<SourceUser> getSourceUsers(final String username, final String clientIp, final SourceSystem sourceSystem, Principal principal)
  {
    return tenantService.getJiraDataClient().fetchUsers(null, principal, true);
  }

  @Override
  @HasAccessToInstanceWithPrivilege(
          privileges = {
                  SecurityAccessLevel.ADMIN
          }
  )
  public List<KhojiIssueType> getIssueTypes(String username, String clientIp, Principal principal)
  {
    return tenantService.getJiraDataClient().fetchIssueTypes(principal);
  }
}
