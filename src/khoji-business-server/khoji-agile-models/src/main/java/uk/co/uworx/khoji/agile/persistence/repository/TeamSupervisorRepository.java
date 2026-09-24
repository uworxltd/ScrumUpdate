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
import uk.co.uworx.khoji.agile.persistence.model.TeamSupervisor;

import java.util.List;

@Repository
public interface TeamSupervisorRepository extends JpaRepository<TeamSupervisor, Long> {
  @Modifying
  @Query("DELETE FROM TeamSupervisor ts WHERE ts.teamId = :teamId")
  void deleteAllByTeamId(Long teamId);

  @Modifying
  @Query("DELETE FROM TeamSupervisor ts WHERE ts.teamId IN :teamIds")
  void deleteAllByTeamIds(List<Long> teamIds);

  @Modifying
  @Query("DELETE FROM TeamSupervisor ts WHERE ts.userId = :userId")
  void deleteAllByUserId(Long userId);

  @Query("SELECT ts.teamId FROM TeamSupervisor ts WHERE ts.userId = :userId")
  List<Long> findTeamIdsUserIsPartOf(Long userId);
}
