/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */


package uk.co.uworx.khoji.agile.persistence.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import uk.co.uworx.khoji.agile.persistence.model.KhojiUser;
import uk.co.uworx.khoji.agile.persistence.model.WorkLogAudit;

import java.util.Optional;

@Repository
public interface WorkLogAuditRepository extends JpaRepository<WorkLogAudit, Long> {

    Optional<WorkLogAudit> findByUniqueIdentifier(String uniqueIdentifier);
}
