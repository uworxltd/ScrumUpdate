/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.persistence.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import uk.co.uworx.khoji.agile.persistence.model.UserAccess;

import java.util.List;

@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
public class KhojiUserDTO {
    private String fullName;
    private String email;
    private List<UserInstanceDTO> instances;

    public KhojiUserDTO(List<UserAccess> userAccessList) {
        this.fullName = userAccessList.get(0).getUser().getFullName();
        this.email = userAccessList.get(0).getUser().getEmail();
        this.instances = userAccessList.stream()
                .map(ua -> new UserInstanceDTO(
                        ua.getInstance().getInstanceName(),
                        ua.getInstance().getTenantId() + "-" + ua.getInstance().getId(),
                        ua.getInstanceUser().getRole().getName(),
                        ua.getInstanceUser().getAccessLevel().getLevelCode()
                ))
                .toList();
    }
}
