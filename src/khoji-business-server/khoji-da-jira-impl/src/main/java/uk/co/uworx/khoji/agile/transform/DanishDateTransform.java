/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.transform;

import com.bazaarvoice.jolt.SpecDriven;
import com.bazaarvoice.jolt.Transform;
import org.springframework.stereotype.Component;
import uk.co.uworx.khoji.agile.BootApplicationContextProviderJiraImpl;
import uk.co.uworx.khoji.agile.service.TenantService;


public class DanishDateTransform implements SpecDriven, Transform {
    private TenantService tenantService;
    private Object spec;

    public DanishDateTransform() {
    }

    public DanishDateTransform(Object spec) {
        tenantService = (TenantService) BootApplicationContextProviderJiraImpl.getContext().getBean("tenantService");
        this.spec = spec;
    }

    @Override
    public Object transform(Object data) {
        ITransform danishDateTransform = tenantService.getTransform(TenantService.DANISH_DATE_TRANSFORM);
        if (danishDateTransform != null) {
            data = danishDateTransform.transform(data, spec);
        }
        return data;
    }
}
