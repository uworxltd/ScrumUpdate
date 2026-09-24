/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.internal.service;

import uk.co.uworx.khoji.agile.internal.model.User;
import uk.co.uworx.khoji.agile.internal.model.UserSettings;
import uk.co.uworx.khoji.agile.persistence.model.AccessLevel;

import java.util.List;

/**
 * Interface for UserSettings
 */
public interface UserSettingsService
{
  /**
   * Fetches list of users with TenantAdmin
   * settings enabled
   *
   * @param fetchActiveTenantAdminsOnly decides whether to fetch active admins
   * @param tenant_id
   * @return users with admin settings
   */
  List<User> getAllTenantAdmins(boolean fetchActiveTenantAdminsOnly, String tenant_id);

  /**
   * Returns access level for a user
   *
   * @param user against access level is returned
   * @return access level
   */
  AccessLevel getAccessLevelForUser(User user);

  /**
   * This returns data of all tenants users
   *
   * @return settings of all users
   */
  List<UserSettings> getAllUsersSettings();

  void deleteAllUserSettings(List<Long> userIds);
}
