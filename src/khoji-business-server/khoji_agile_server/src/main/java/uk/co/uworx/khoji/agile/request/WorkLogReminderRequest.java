/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class WorkLogReminderRequest {
    @NotNull
    private String supervisorId;
    @NotNull
    private List<String> memberIds;
    @NotNull
    private String workLogUrl;
    @NotNull
    private String dateFrom;
    @NotNull
    private String dateTo;
    private String customText;

    public WorkLogReminderRequest(
            @JsonProperty("supervisorId") String supervisorId,
            @JsonProperty("memberIds") List<String> memberIds,
            @JsonProperty("workLogUrl") String workLogUrl,
            @JsonProperty("dateFrom") String dateFrom,
            @JsonProperty("dateTo") String dateTo,
            @JsonProperty("customText") String customText
    )
    {
        this.supervisorId = supervisorId;
        this.memberIds = memberIds;
        this.workLogUrl = workLogUrl;
        this.dateFrom = dateFrom;
        this.dateTo = dateTo;
        this.customText = customText;
    }
}
