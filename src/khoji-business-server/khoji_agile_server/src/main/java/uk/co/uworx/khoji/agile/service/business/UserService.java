/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.service.business;


import jakarta.transaction.Transactional;
import lombok.extern.log4j.Log4j2;
import org.apache.commons.collections4.CollectionUtils;
import org.apache.commons.lang3.ObjectUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import uk.co.uworx.khoji.agile.internal.error.ServiceError;
import uk.co.uworx.khoji.agile.internal.error.ServiceException;
import uk.co.uworx.khoji.agile.persistence.dto.KhojiUserDTO;
import uk.co.uworx.khoji.agile.persistence.model.Instance;
import uk.co.uworx.khoji.agile.persistence.model.KhojiUser;
import uk.co.uworx.khoji.agile.persistence.model.UserAccess;
import uk.co.uworx.khoji.agile.persistence.model.UserSettings;
import uk.co.uworx.khoji.agile.persistence.service.IdentityProviderDataService;
import uk.co.uworx.khoji.agile.persistence.service.InstanceDataService;
import uk.co.uworx.khoji.agile.persistence.service.InstanceUserDataService;
import uk.co.uworx.khoji.agile.persistence.service.KhojiUserDataService;
import uk.co.uworx.khoji.agile.persistence.service.UserAccessDataService;
import uk.co.uworx.khoji.agile.persistence.service.UserSettingsDataService;
import uk.co.uworx.khoji.agile.response.UserAccountModel;
import uk.co.uworx.khoji.security.subscription.ValidateUserSubscriptionService;

import java.security.Principal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static uk.co.uworx.khoji.security.helper.SecurityConstants.USER_EMAIL_KEY;

@Service
@Log4j2
public class UserService
{
    @Autowired
    private KhojiUserDataService khojiUserDataService;
    @Autowired
    private ValidateUserSubscriptionService validateUserSubscriptionService;
    @Autowired
    private InstanceDataService instanceDataService;
    @Autowired
    private InstanceService instanceService;
    @Autowired
    private InstanceUserDataService instanceUserDataService;
    @Autowired
    private UserAccessDataService userAccessDataService;
    @Autowired
    private UserSettingsDataService userSettingsDataService;
    @Autowired
    private IdentityProviderDataService identityProviderDataService;

    public KhojiUser getUserProfileDetails(Principal principal)
    {
        return khojiUserDataService
                .findByEmail(principal.getName())
                .orElseThrow(() -> {
                    log.error("User not found against email: {}", principal.getName());
                    return new ServiceException(ServiceError.U0100);
                });
    }

    @Transactional
    public void deleteUserProfileAndRelatedInformation(Principal principal)
    {
        KhojiUser khojiUser = khojiUserDataService
                .findByEmail(principal.getName())
                .orElseThrow(() -> {
                    log.error("User not found against email: {}", principal.getName());
                    return new ServiceException(ServiceError.U0100);
                });

        List<Instance> instanceList = instanceDataService.findInstancesByUserId(khojiUser.getId());

        for (int i = 0; i < instanceList.size(); i++)
        {
            instanceService.deleteInstanceAndRelatedInformation(instanceList.get(i).getId());
        }

        khojiUserDataService.deleteKhojiUserProfileById(khojiUser.getId());
    }

    public void updateUserEmailSettings(UserSettings userSettingsToUpdate, Principal principal)
    {
        List<UserAccess> userAccesses = userAccessDataService.findByEmail(principal.getName());

        if (CollectionUtils.isEmpty(userAccesses))
        {
            throw new ServiceException(ServiceError.UA404);
        }

        userAccesses.forEach(ua -> {
            UserSettings userSettings = ua.getInstanceUser().getUserSettings();
            if(ObjectUtils.isNotEmpty(userSettings))
            {
                userSettings.setWorklogEmailEnabled(userSettingsToUpdate.isWorklogEmailEnabled());
                userSettings.setWorklogEmailFrequency(userSettingsToUpdate.getWorklogEmailFrequency());

                userSettingsDataService.saveOrUpdate(userSettings);
            }
        });
    }

    public UserSettings getUserSettingsByUserId(Principal principal)
    {
        return userAccessDataService
                .findByEmail(principal.getName())
                .stream()
                .findFirst()
                .map(ua -> ua.getInstanceUser().getUserSettings())
                .orElseThrow(() -> new ServiceException(ServiceError.UA400));
    }

    public Map<String, String> validateUser(String sourceCode, String email)
    {
        HashMap<String, String> map =
                validateUserSubscriptionService.fetchAccessTokenAndTenantDetailsFromSSO_CODE(sourceCode);
        String fetchedEmail = map.get(USER_EMAIL_KEY);
        if (fetchedEmail != null && fetchedEmail.equals(email))
        {
            return Map.of("message", "success");
        }
        else
        {
            throw new ServiceException(ServiceError.C0409);
        }
    }

    public List<KhojiUserDTO> getAllActiveUsers() {
        Map<String, List<UserAccess>> groupedByEmail = new HashMap<>();

        userAccessDataService.findAll().forEach(userAccess -> {
            groupedByEmail.computeIfAbsent(userAccess.getUser().getEmail(), email -> new ArrayList<>()).add(userAccess);
        });

        return groupedByEmail
                .values()
                .stream()
                .map(KhojiUserDTO::new)
                .toList();
    }

    public UserAccountModel getUserNamesAgainstRefreshToken(List<String> tokens)
    {
        return identityProviderDataService.getUserDetailsAndInvalidTokens(tokens);
    }
}
