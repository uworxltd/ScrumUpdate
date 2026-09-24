/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.security.annotations;

import org.springframework.security.access.prepost.PreAuthorize;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * This annotation allows user having
 * Application, Admin and Tenant Admin access to
 * use API
 */
@Target({ElementType.TYPE, ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
@PreAuthorize("hasAuthority('APP') || hasAuthority('ADMIN') || hasAuthority('TENANT_ADMIN')")
@Deprecated(forRemoval = true)
public @interface AuthorizedApplicationLevelAdminAPIs
{
}
