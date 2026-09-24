/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.internal.datamodel;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import uk.co.uworx.khoji.agile.internal.model.Issue;


@NoArgsConstructor
@Getter
@Setter
public class KhojiInternalIssueDataModel extends Issue {
    private String updatedDate;

    public KhojiInternalIssueDataModel(Issue issue)
    {
        super(issue);
    }
}
