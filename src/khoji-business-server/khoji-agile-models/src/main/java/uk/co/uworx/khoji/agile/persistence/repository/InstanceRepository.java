/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.persistence.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import uk.co.uworx.khoji.agile.persistence.model.Instance;
import uk.co.uworx.khoji.agile.persistence.model.Workspace;

import java.util.List;
import java.util.Optional;

@Repository
public interface InstanceRepository extends JpaRepository<Instance, Long> {
    @Query("SELECT i FROM Instance i WHERE i.id = :instanceId")
    Optional<Instance> findByInstanceId(Long instanceId);

    @Modifying
    @Query("DELETE FROM Instance i WHERE i.id = :instanceId")
    void deleteByInstanceId(Long instanceId);

    @Query("SELECT i FROM Instance i JOIN i.workspace w WHERE w.owner.id = :userId")
    List<Instance> findByOwnerUserId(@Param("userId") Long userId);

    List<Instance> findAllByWorkspace(Workspace workspace);
}
