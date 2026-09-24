/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.internal.service;

import org.springframework.transaction.annotation.Transactional;
import uk.co.uworx.khoji.agile.internal.model.Member;

import java.util.List;
import java.util.Optional;

public interface MemberService
{
  void validateNewMember(Member member);
  @Transactional
  Member createMember(Member member, String loggedInUser, String loggedInUserIp);
  List<Member> getMembers();
  Optional<Member> findById(long id);
  Optional<Member> findByAccountId(String accountId);
  List<Optional<Member>> findByAccountIdIn(List<String> accountIds);
  List<String> getTeamsAssignedToMember(Long memberid);
  @Transactional
  Member update(Member member, String loggedInUser, String loggedInUserIp, boolean isRequestedUserSameAndNotTenantAdmin);
  @Transactional
  void deleteMemberById(long id, String loggedInUser, String loggedInUserIp);
  List<Member> getMemberByLocation(Long locationId);
  List<Member> getActiveMemberInTeamForGivenDateRange(Long teamId, String dateFrom, String dateTo);
  void deleteAllMembers(List<Long> membersId);
}
