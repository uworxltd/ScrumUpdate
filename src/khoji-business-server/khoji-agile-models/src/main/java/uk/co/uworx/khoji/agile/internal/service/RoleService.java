/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */


package uk.co.uworx.khoji.agile.internal.service;

import uk.co.uworx.khoji.agile.persistence.model.Roles;

import java.util.List;
import java.util.Optional;

public interface RoleService
{
  Roles createRole(Roles role);

  Roles updateRole(Roles role);

  List<Roles> getRoles();

  Optional<Roles> getRoleById(Long id);

  /**
   * Get role by code
   *
   * @param code of role
   * @return Role
   */
  Roles getRoleByCode(String code);
}
