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
import uk.co.uworx.khoji.agile.persistence.model.Config;

@Repository
public interface ConfigRepository extends JpaRepository<Config, Long> {
    @Query("SELECT propValue FROM Config WHERE instanceId = :instanceId AND propKey = :propKey")
    String findConfigByInstanceId(@Param("instanceId") Long instanceId, @Param("propKey") String propKey);
}
