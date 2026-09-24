/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.persistence.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import uk.co.uworx.khoji.agile.persistence.model.InstanceUser;
import uk.co.uworx.khoji.agile.persistence.model.UserAccess;
import uk.co.uworx.khoji.agile.persistence.repository.UserAccessRepository;

import java.util.List;
import java.util.Optional;

@Service
public class UserAccessDataService {
    @Autowired
    private UserAccessRepository userAccessRepository;

    public List<UserAccess> findByEmail(String email) {
        return userAccessRepository.findUserAccessByEmail(email);
    }

    public Optional<UserAccess> findByEmailAndInstanceId(String userEmail, Long instanceId)
    {
        return userAccessRepository.findByUserEmailAndByInstanceId(userEmail, instanceId);
    }

    public Optional<UserAccess> findByUserIdAndInstanceId(Long userId, Long instanceId)
    {
        return userAccessRepository.findByUserIdAndByInstanceId(userId, instanceId);
    }

    public List<UserAccess> findByInstanceId(Long instanceId)
    {
        return userAccessRepository.findByInstanceId(instanceId);
    }

    public UserAccess createOrUpdateUserAccess(UserAccess userAccess)
    {
        return userAccessRepository.save(userAccess);
    }

    public List<UserAccess> findAll()
    {
        return userAccessRepository.findAll();
    }

    public Optional<UserAccess> findByInstanceUser(InstanceUser instanceUser)
    {
        return userAccessRepository.findByInstanceUser(instanceUser);
    }
}
