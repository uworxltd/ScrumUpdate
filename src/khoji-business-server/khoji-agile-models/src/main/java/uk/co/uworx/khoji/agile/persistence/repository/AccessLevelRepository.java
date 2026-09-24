/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.persistence.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import uk.co.uworx.khoji.agile.persistence.model.AccessLevel;

import java.util.List;
import java.util.Optional;

@Repository
public interface AccessLevelRepository extends JpaRepository<AccessLevel, Long>
{
  Optional<AccessLevel> findById(Long id);

  AccessLevel findByLevelCode(String levelCode);

  @Query(
          value = """
                  WITH RECURSIVE access_hierarchy AS (
                      -- Base case: find the access level by the given userCode
                      SELECT al.id, al.level_code, al.parent_code
                      FROM access_level al
                      WHERE al.level_code = :userCode
                      UNION ALL
                      -- Recursive case: find all children of the current access level
                      SELECT a.id, a.level_code, a.parent_code
                      FROM access_level a
                      INNER JOIN access_hierarchy ah ON a.parent_code = ah.level_code
                  )
                  SELECT level_code
                  FROM access_hierarchy;
                  """,
          nativeQuery = true
  )
  List<String> findAllAccessibleLevels(String userCode);
}
