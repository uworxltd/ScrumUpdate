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
import uk.co.uworx.khoji.agile.persistence.model.Teams;
import uk.co.uworx.khoji.agile.persistence.projection.TeamProjection;

import java.util.List;
import java.util.Optional;

@Repository
public interface TeamsRepository extends JpaRepository<Teams, Long> {
  String COMPLETE_TEAMS_DETAILS_QUERY = """
  SELECT t.id as id,
         t.name as team_name,
         (
              SELECT json_agg(mem) FROM
              (
                  SELECT u.id AS id,
                         u.full_name AS "fullName",
                         false AS "isInMultipleTeams",
                         u.email AS "memberEmail",
                         u.account_id AS "accountId",
                         r AS "role",
                         u.status as "status"
                  FROM team_members tm
                  JOIN instance_user u ON tm.user_id = u.id
                  INNER JOIN roles r ON r.id = u.role_id
                  WHERE tm.team_id = t.id AND u.instance_id = :instanceId
              ) mem
         ) as members,
         (
              SELECT json_agg(sup) FROM
              (
                  SELECT u.id AS id,
                         u.full_name AS "fullName",
                         false AS "isInMultipleTeams",
                         u.email AS "memberEmail",
                         u.account_id AS "accountId",
                         r AS "role",
                         u.status as "status"
                  FROM team_supervisor ts
                  JOIN instance_user u ON ts.user_id = u.id
                  INNER JOIN roles r ON r.id = u.role_id
                  WHERE ts.team_id = t.id AND u.instance_id = :instanceId
              ) sup
         ) as supervisors
  FROM teams t
  WHERE t.instance_id = :instanceId
  """;

  @Query(
          value = COMPLETE_TEAMS_DETAILS_QUERY,
          nativeQuery = true
  )
  List<TeamProjection> findTeamsByInstanceId(Long instanceId);

  @Query(
          value = COMPLETE_TEAMS_DETAILS_QUERY + "AND t.id IN :teamIds",
          nativeQuery = true
  )
  List<TeamProjection> findTeamsFromIdsByInstanceId(List<Long> teamIds, Long instanceId);

  @Query(
          value = COMPLETE_TEAMS_DETAILS_QUERY + "AND t.name IN :teamNames",
          nativeQuery = true
  )
  List<TeamProjection> findTeamsFromNameByInstanceId(List<String> teamNames, Long instanceId);

  @Query("SELECT t FROM Teams t WHERE t.id = :teamId AND t.instance.id = :instanceId")
  Optional<Teams> findSimpleTeamFromIdByInstanceId(Long teamId, Long instanceId);

  @Query("SELECT t FROM Teams t WHERE t.id IN :teamId")
  List<Teams> findSimpleTeamsFromIds(List<Long> teamId);

  @Query("SELECT t FROM Teams t WHERE t.instance.id = :instanceId")
  List<Teams> findAllByInstanceId(Long instanceId);

  @Modifying
  @Query("DELETE FROM Teams t WHERE t.id IN :ids")
  void deleteTeamsByIds(List<Long> ids);

  @Modifying
  @Query("DELETE FROM Teams t WHERE t.instance.id = :instanceId")
  void deleteTeamsByInstanceId(Long instanceId);
}
