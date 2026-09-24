/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.persistence.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import uk.co.uworx.khoji.agile.persistence.model.TeamMembers;

import java.util.List;

@Repository
public interface TeamMembersRepository extends JpaRepository<TeamMembers, Long> {
  @Modifying
  @Query("DELETE FROM TeamMembers tm WHERE tm.teamId = :teamId")
  void deleteAllByTeamId(Long teamId);

  @Modifying
  @Query("DELETE FROM TeamMembers tm WHERE tm.teamId IN :teamIds")
  void deleteAllByTeamIds(List<Long> teamIds);

  @Modifying
  @Query("DELETE FROM TeamMembers tm WHERE tm.userId = :userId")
  void deleteAllByUserId(Long userId);

  @Query("SELECT tm.teamId FROM TeamMembers tm WHERE tm.userId = :userId")
  List<Long> findTeamIdsUserIsPartOf(Long userId);
}
