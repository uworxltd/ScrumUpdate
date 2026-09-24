/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */


package uk.co.uworx.khoji.agile.controller.admin.api;

import io.swagger.v3.oas.annotations.Operation;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import uk.co.uworx.khoji.agile.internal.model.ProjectSourceUser;
import uk.co.uworx.khoji.agile.internal.model.SourceAndKhojiUsersTeam;
import uk.co.uworx.khoji.agile.internal.model.Team;
import uk.co.uworx.khoji.agile.internal.model.TeamOnboarding;
import uk.co.uworx.khoji.agile.internal.model.User;

import jakarta.validation.Valid;
import uk.co.uworx.khoji.agile.persistence.dto.TeamDTO;
import uk.co.uworx.khoji.agile.persistence.model.InstanceUser;
import uk.co.uworx.khoji.agile.persistence.model.KhojiUser;

import java.security.Principal;
import java.util.List;

@CrossOrigin
@RequestMapping("/onboarding")
public interface OnboardingAPI
{
  @Operation(summary = "Create/Save Team and Users")
  @PostMapping(value = "/team")
  TeamDTO saveTeamAndSourceUsers(
          @RequestBody @Valid TeamOnboarding teamOnboarding,
          Principal principal
  );

  @Operation(summary = "Create/Save Team with Khoji Users and Source Users")
  @PostMapping(value = "/team/sourceAndSystem")
  TeamDTO saveTeamWithSourceUsersAndKhojiUsers(
          @RequestBody SourceAndKhojiUsersTeam sourceAndKhojiUsersTeam,
          Principal principal
  );

  @Operation(summary = "Create/Update Source Users")
  @PostMapping(value = "/inviteUser")
  List<InstanceUser> saveOrUpdateSourceUsers(
          @RequestBody @Valid List<ProjectSourceUser> sourceUsers,
          Principal principal
  );
}
