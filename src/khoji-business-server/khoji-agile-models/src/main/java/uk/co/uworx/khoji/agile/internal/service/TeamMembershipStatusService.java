/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.internal.service;

import org.springframework.transaction.annotation.Transactional;
import uk.co.uworx.khoji.agile.internal.model.Member;
import uk.co.uworx.khoji.agile.internal.model.Team;
import uk.co.uworx.khoji.agile.internal.model.request.MembershipStatusResponse;

public interface TeamMembershipStatusService
{
  @Transactional
  void addMembershipChange(Team team, Member member, String changeType);
  MembershipStatusResponse getMembershipStatusCount(Long teamId);
}
