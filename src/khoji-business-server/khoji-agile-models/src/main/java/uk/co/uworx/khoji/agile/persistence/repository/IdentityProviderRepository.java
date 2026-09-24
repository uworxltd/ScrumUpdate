/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.persistence.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import uk.co.uworx.khoji.agile.persistence.model.IdentityProvider;

import java.util.List;
import java.util.Optional;

@Repository
public interface IdentityProviderRepository extends JpaRepository<IdentityProvider, Long> {
  List<IdentityProvider> findByUserId(Long userId);
  IdentityProvider findByLoginCode(String loginCode);

  @Query(
          value = "SELECT ip.* FROM khoji.identity_provider ip " +
                  "JOIN khoji.khoji_user u ON ip.user_id = u.id " +
                  "WHERE u.email = :email",
          nativeQuery = true
  )
  Optional<IdentityProvider> findByUserEmail(String email);

  List<IdentityProvider> findAllByLoginCodeIn(List<String> loginCode);
}
