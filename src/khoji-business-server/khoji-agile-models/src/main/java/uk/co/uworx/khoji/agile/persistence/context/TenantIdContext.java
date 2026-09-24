/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */


package uk.co.uworx.khoji.agile.persistence.context;

import org.springframework.stereotype.Component;

@Component
public class TenantIdContext
{
    private static final ThreadLocal<String> tenantIdHolder = new ThreadLocal<>();

    public static void setTenantId(String tenantId) {
        tenantIdHolder.set(tenantId);
    }

    public static String getTenantId() {
        return tenantIdHolder.get();
    }

    public static void clear() {
        tenantIdHolder.remove();
    }
}
