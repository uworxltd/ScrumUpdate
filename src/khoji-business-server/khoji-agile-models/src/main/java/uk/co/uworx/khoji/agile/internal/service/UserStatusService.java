/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.internal.service;

import uk.co.uworx.khoji.agile.internal.model.User;
import uk.co.uworx.khoji.agile.internal.model.UserStatus;

import java.util.List;

public interface UserStatusService
{
  void setUserStatusOnCreation(final User savedUser);
  void setUserIncompleteStatusOnCreation(final User savedUser);
  void setUserStatusOnSignUp(final User savedUser);
  void revokeAccessForUser(final User user);
  void setUserStatusToLastValidStatus(final User user);
  void setEnableAccessForUser(final User user,String loggedInUser, String loggedInUserIp);
  void deleteAllUserStatuses(List<Long> userIds);
  UserStatus updateIncompleteUserStatus(final User user, String loggedInUser, String loggedInUserIp);
}
