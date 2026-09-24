/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.persistence.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import uk.co.uworx.khoji.agile.persistence.model.InstanceUserConfig;

import java.util.List;
import java.util.Optional;

@Repository
public interface InstanceUserConfigRepository extends JpaRepository<InstanceUserConfig, Long>
{
  @Query("SELECT iuc FROM InstanceUserConfig iuc WHERE iuc.instanceUser.id = :instanceUserId")
  List<InstanceUserConfig> findAllByInstanceUserId(@Param("instanceUserId") Long instanceUserId);

  @Query("SELECT iuc FROM InstanceUserConfig iuc WHERE iuc.key = :key AND iuc.instanceUser.id = :instanceUserId")
  Optional<InstanceUserConfig> findByKeyAndByInstanceUserId(@Param("key") String key, @Param("instanceUserId") Long instanceUserId);
}
