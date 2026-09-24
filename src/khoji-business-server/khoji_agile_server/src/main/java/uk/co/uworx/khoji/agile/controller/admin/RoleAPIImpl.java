/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */


package uk.co.uworx.khoji.agile.controller.admin;

import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.RestController;
import uk.co.uworx.khoji.agile.controller.admin.api.RoleAPI;
import uk.co.uworx.khoji.agile.internal.helper.SecurityAccessLevel;
import uk.co.uworx.khoji.agile.internal.service.RoleService;
import uk.co.uworx.khoji.agile.persistence.model.Roles;
import uk.co.uworx.khoji.agile.persistence.service.RolesDataService;
import uk.co.uworx.khoji.security.annotations.AuthorizationApplicationLevelAPIs;
import uk.co.uworx.khoji.security.annotations.HasAccessToInstanceWithPrivilege;

import java.util.List;

@RestController
@Tag(name = "Khoji For Agile", description = "Operations to handle Roles(s) in Khoji For Agile")
@Validated
public class RoleAPIImpl implements RoleAPI
{
  private RoleService roleService;
  @Autowired
  private RolesDataService rolesDataService;


  @Override
  @HasAccessToInstanceWithPrivilege(
          privileges = {
                  SecurityAccessLevel.ADMIN
          }
  )
  public ResponseEntity<List<Roles>> getRoles()
  {
    return new ResponseEntity<>(rolesDataService.getRoles(), HttpStatus.OK);
  }

  @Override
  @AuthorizationApplicationLevelAPIs
  public ResponseEntity<Roles> createNewRole(Roles.Request roles)
  {
    return new ResponseEntity<>(rolesDataService.createRole(new Roles(roles)), HttpStatus.OK);
  }
}
