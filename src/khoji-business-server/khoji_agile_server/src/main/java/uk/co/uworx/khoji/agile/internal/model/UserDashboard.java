/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.internal.model;

import com.fasterxml.jackson.annotation.JsonView;
import lombok.AllArgsConstructor;
import lombok.Data;
import uk.co.uworx.khoji.agile.internal.model.request.Views;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.List;

@Data
@NoArgsConstructor
@JsonView(Views.UserProfileView.class)
@AllArgsConstructor
public class UserDashboard implements Serializable {
    private UserSettings userSettings;
    private String userProfileBase64String;
    private List<String> accessibleAccessLevels;
    private boolean isProjectSourceConfigured;
    private boolean inTrial;
    private String nextBillingDate;
}
