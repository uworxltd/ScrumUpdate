/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.transform;

import com.bazaarvoice.jolt.Transform;
import uk.co.uworx.khoji.agile.BootApplicationContextProviderJiraImpl;
import uk.co.uworx.khoji.agile.service.TenantService;

/**
 * Jolt transformation class for Comment
 */

public class UpdatedDateTimeTransform implements Transform {
    private ITransform updatedDateTimeTransform;
    private TenantService tenantService;

    public UpdatedDateTimeTransform() {
        tenantService = (TenantService) BootApplicationContextProviderJiraImpl.getContext().getBean("tenantService");
    }

    public UpdatedDateTimeTransform(TenantService tenantService) {
        this.tenantService = tenantService;
    }

    @Override
    public Object transform(Object data) {
        updatedDateTimeTransform = tenantService.getTransform("UpdatedDateTimeTransform");
        if (updatedDateTimeTransform != null) {
            data = updatedDateTimeTransform.transform(data, null);
        }
        return data;
    }
}
