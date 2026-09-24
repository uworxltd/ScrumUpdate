/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.persistence.repository;

import jakarta.transaction.Transactional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import uk.co.uworx.khoji.agile.persistence.model.KhojiUser;

import java.util.Optional;

@Repository
public interface KhojiUserRepository extends JpaRepository<KhojiUser, Long> {
  Optional<KhojiUser> findByEmail(String email);

  @Modifying
  @Transactional
  @Query(value = """
    DELETE FROM workspace
    WHERE owner_user_id = :userId;

    DELETE FROM user_access
    WHERE user_id = :userId;

    DELETE FROM identity_provider
    WHERE user_id = :userId;
    
    DELETE FROM khoji_user
    WHERE id = :userId;
    """, nativeQuery = true)
  void deleteUserAndRelatedData(@Param("userId") Long userId);
}
