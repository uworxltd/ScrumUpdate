/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */


package uk.co.uworx.khoji.agile.controller.admin.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import uk.co.uworx.khoji.agile.internal.model.User;
import uk.co.uworx.khoji.agile.internal.model.UserDetail;
import uk.co.uworx.khoji.agile.persistence.model.AccessLevel;

import java.security.Principal;
import java.util.List;

@CrossOrigin
@Tag(
        name = "Khoji For Agile",
        description = "Operations to handle users in Khoji For Agile"
)
public interface UserAPI
{
  @Operation(summary = "Invite Again after Revoked Access")
  @PostMapping(value = "/user/enable-access")
  ResponseEntity<User> enableAccessAfterRevoke(
          @RequestHeader("username") String username,
          @RequestHeader(
                  value = "clientip",
                  required = false
          ) String clientIp,
          @RequestBody Long usernameIdentifier,
          Principal principal
  );

  @Operation(summary = "Get Users")
  @GetMapping(value = "/users")
  List<User> getUsers();

  @Operation(summary = "Get Users")
  @GetMapping(value = "/usersInTeam")
  List<User> getUsersInTeam();

  @Operation(summary = "Get basic users")
  @GetMapping(value = "/basicUsers")
  List<User> getBasicUsers();

  @Operation(summary = "Revoke access for User")
  @PostMapping(value = "/user/revoke")
  ResponseEntity<User> revokeUserAccess(
          @RequestHeader("username") String username,
          @RequestHeader(
                  value = "clientip",
                  required = false
          ) String clientIp,
          @RequestBody Long usernameIdentifier,
          Principal principal
  );

  @Operation(summary = "Get all access levels")
  @GetMapping(value = "/user/access-levels")
  List<AccessLevel> getAllUserAccessLevels();

  @Operation(summary = "Update User details, Role, Access and Email")
  @PostMapping(value = "/update/users/details")
  ResponseEntity<List<User>> updateUsersDetails(@RequestBody List<UserDetail> usersList, Principal principal);

  @Operation(summary = "Post users by member ids")
  @PostMapping(value = "/usersByMemberIds")
  ResponseEntity<List<User>> getUsersByMemberIds(@RequestBody List<Long> memberIdsList);
}
