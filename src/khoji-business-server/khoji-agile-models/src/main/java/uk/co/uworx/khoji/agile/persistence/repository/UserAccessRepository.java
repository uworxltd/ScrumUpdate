/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.persistence.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import uk.co.uworx.khoji.agile.persistence.model.InstanceUser;
import uk.co.uworx.khoji.agile.persistence.model.UserAccess;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserAccessRepository extends JpaRepository<UserAccess, Long> {
    @Query("SELECT ua FROM UserAccess ua JOIN ua.user ku WHERE ku.email = :email")
    List<UserAccess> findUserAccessByEmail(String email);

    @Query("SELECT ua FROM UserAccess ua WHERE ua.user.id = :userId AND ua.instance.id = :instanceId")
    Optional<UserAccess> findByUserIdAndByInstanceId(Long userId, Long instanceId);

    @Query("SELECT ua FROM UserAccess ua WHERE ua.user.email = :userEmail AND ua.instance.id = :instanceId")
    Optional<UserAccess> findByUserEmailAndByInstanceId(String userEmail, Long instanceId);

    @Query("SELECT ua FROM UserAccess ua WHERE ua.instance.id = :instanceId")
    List<UserAccess> findByInstanceId(Long instanceId);

    Optional<UserAccess> findByInstanceUser(InstanceUser instanceUser);
}
