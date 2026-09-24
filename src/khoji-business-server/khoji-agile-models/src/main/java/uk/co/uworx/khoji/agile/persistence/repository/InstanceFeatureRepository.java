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
import uk.co.uworx.khoji.agile.persistence.model.Instance;
import uk.co.uworx.khoji.agile.persistence.model.InstanceFeature;

import java.util.List;

@Repository
public interface InstanceFeatureRepository extends JpaRepository<InstanceFeature, Long> {
  @Query(
          value = "SELECT CASE WHEN COUNT(*) > 0 THEN true ELSE false END " +
                  "FROM instance_feature " +
                  "WHERE feature_id = :featureId AND instance_id = :instanceId",
          nativeQuery = true
  )
  boolean existsByFeatureAndInstance(@Param("featureId") long featureId, @Param("instanceId") long instanceId);

  List<InstanceFeature> findAllByInstance(Instance instance);
}
