/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */


package uk.co.uworx.khoji.agile.internal.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.commons.lang3.StringUtils;
import uk.co.uworx.khoji.agile.constant.Constants;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class KhojiComponent {

    private String id;
    private boolean enabled;

    /***
     * Method to parse string into boolean
     * @param enabled
     */
    @JsonProperty("enabled")
    public void setEnabled(String enabled)
    {
        if (StringUtils.isNotEmpty(enabled) && (enabled.equalsIgnoreCase("true") || enabled.equalsIgnoreCase("false")))
        {
            this.enabled = Boolean.parseBoolean(enabled);
        }
        else
        {
            this.enabled = false;
        }
    }

    public void setEnabledValue(boolean enabled)
    {
        this.enabled = enabled;
    }
}


