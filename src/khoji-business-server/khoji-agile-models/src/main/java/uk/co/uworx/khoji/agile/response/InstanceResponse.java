/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.response;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import uk.co.uworx.khoji.agile.persistence.model.Feature;
import uk.co.uworx.khoji.agile.persistence.model.Instance;
import uk.co.uworx.khoji.agile.persistence.model.InstanceUser;
import uk.co.uworx.khoji.agile.persistence.model.KhojiUser;

import java.util.List;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class InstanceResponse {
    private Long id;
    private String name;
    private String imageUrl;
    private String tenantId;
    private int memberCount;
    private int nonRevokedUsers;
    Map<String, Object> limitationAndComponents;
    InstanceUserForInstanceResponse instanceUser;
    List<Feature> instanceFeatures;
    private boolean sharedInstance;
    private KhojiUser ownerInformation;

    public InstanceResponse(
            InstanceUser instanceUser,
            Instance instance,
            int memberCount,
            int nonRevokedUsers,
            Map<String, Object> limitationAndComponents,
            List<Feature> instanceFeatures,
            boolean sharedInstance,
            KhojiUser ownerInformation
    )
    {
        this.id = instance.getId();
        this.name = instance.getInstanceName();
        this.imageUrl = instance.getInstanceImageUrl();
        this.memberCount = memberCount;
        this.nonRevokedUsers = nonRevokedUsers;
        this.tenantId = instance.getTenantId();
        this.limitationAndComponents = limitationAndComponents;
        this.instanceFeatures = instanceFeatures;
        this.instanceUser = new InstanceUserForInstanceResponse(
                instanceUser.getAccessLevel().getLevelCode(),
                instanceUser.getAccountId(),
                instanceUser.getFullName(),
                instanceUser.getAvatarUrl()
        );
        this.sharedInstance = sharedInstance;
        this.ownerInformation = ownerInformation;
    }

    @Getter
    @Setter
    @AllArgsConstructor
    @NoArgsConstructor
    public static class InstanceUserForInstanceResponse {
        String accessLevelCode;
        String accountId;
        String fullName;
        String avatarUrl;
    }
}
