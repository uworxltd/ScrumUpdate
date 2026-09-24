/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */


package uk.co.uworx.khoji.agile.internal.model;

import java.util.List;

import lombok.Data;
import uk.co.uworx.khoji.agile.internal.datamodel.KhojiIssueType;

@Data
public class WorklogDistributionConfig {
    String description;
    String color;
    List<KhojiIssueType> issueTypes;
}
