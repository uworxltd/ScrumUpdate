/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.internal.service;

import uk.co.uworx.khoji.agile.internal.model.ChangePassword;
import uk.co.uworx.khoji.agile.internal.model.Member;
import uk.co.uworx.khoji.agile.internal.model.SignUp;
import uk.co.uworx.khoji.agile.internal.model.Team;
import uk.co.uworx.khoji.agile.internal.model.User;
import uk.co.uworx.khoji.agile.internal.model.UserDetail;
import uk.co.uworx.khoji.agile.internal.model.UserSettings;
import uk.co.uworx.khoji.agile.internal.model.WorkLogModel;

import java.util.List;
import java.util.Optional;
import java.util.Set;

public interface UserService
{
  void validateUserExists(User user);

  User createUser(User user, String loggedInUser, String loggedInUserIp, boolean checkLimitation);

  List<User> getUsers();
  List<User> getAllUsers();

  List<WorkLogModel> fetchAllUsersAcrossTenantsForWorkLogEmails();

  User findById(long id);

  User findByIdWithAllStatus(long id);

  Optional<User> findByEmail(String email);

  List<String> getuserAccessTeams(User user);

  Optional<User> findByUsername(String username);

  User update(User updatedUser,User existingUser, String loggedInUser, String loggedInUserIp, long id, boolean isRequestedUserSameAndNotTenantAdmin);

  User updateUserInDb(User updateUser);

  User update(List<Team> teamsData, String loggedInUser, String loggedInUserIp, long id);

  Team updateSupervisors(Set<Long> memberId, Team team);

  User update(SignUp signup, String accountId);

  void deleteUserById(long id, String loggedInUser, String loggedInUserIp);

  UserSettings findUserSettingsById(long id);

  UserSettings updateSettings(UserSettings userSettings, String loggedInUser, String loggedInUserIp, long id);

  User updateTeams(long id, long user, String username, String clientIp);

  Optional<User> findByMember(Member member);

  Optional<User> findByActivationCode(String activationCode);

  void revokeUserAccess(User user, String loggedInUser, String loggedInUserIp);

  boolean isAnActiveUser(String username);

  boolean isUserRevoked(User user);

  boolean isUserPending(User user);

  boolean isUserTenantAdmin(User user);

  Optional<User> findByAccountId(String accountId);

  List<Optional<User>> findByAccountIdIn(List<String> accountId);

  List<User> getRevokedUsers(List<User> workLogUsers);

  List<User> getActiveUsers(List<User> users);

  boolean updateUserPassword(User user, String username, String clientIp, ChangePassword changePassword);

  String getNewActivationCode();

  void validateExistingUserWithDuplicateEmail(final User user);

  void deleteAllUsers(List<Long> userIds);

  void deleteUserFromSystem(User user);

  void removeSupervisors(Set<Long> memberId, Team team);

  void removeRevokedUserFromAllSupervisors(User user);

  User getUserDetails(UserDetail userDetail);

  boolean isUserAJoinedUser(User users);

  List<User> getUsersByMemberIdList(List<String> memberIds);
}
