/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */


package uk.co.uworx.khoji.agile.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
public class EmailConfig {
    @Value("${EMAIL_FROM:}")
    public String from;

    @Value("${EMAIL_HOST:}")
    public String host;

    @Value("${EMAIL_PORT:587}")
    public String port;

    @Value("${EMAIL_USERNAME:}")
    public String emailUsername;

    @Value("${EMAIL_PASSWORD:}")
    public String emailPassword;

    @Value("${EMAIL_STARTTLS:true}")
    public boolean mailSmtpStarttlsEnable;

    @Value("${EMAIL_SSL_PROTOCOLS:TLSv1.2}")
    public String mailSmtpSslProtocols;

    @Value("${email.inviteUser.velocityTemplate:inviteAUserEmailTemplate.vm}")
    public String inviteUserEmailVelocityTemplate;

    @Value("${email.inviteTenant.velocityTemplate:inviteATenantAdminEmailTemplate.vm}")
    public String inviteTenantAdminEmailVelocityTemplate;

    @Value("${email.enableAccess.velocityTemplate:enableAccessEmailTemplate.vm}")
    public String enableAccessEmailVelocityTemplate;

    @Value("${base.url:http://localhost:4241}${khoji.user.login.url:/login}")
    public String khojiUrl;

    @Value("${base.url:http://localhost:4241}${khoji.user.request.access.url:/admin-panel/tenant-dashboard/manage-users/new-user?selected-user-id=%s}")
    public String khojiRequestAccessUrl;

    @Value("${base.url:http://localhost:4241}${khoji.user.timelog.url:/login?instance=%s&feature=team-view&teamName=%s&dateFrom=%s&dateTo=%s}")
    public String khojiTimelogUrl;

    @Value("${base.url:http://localhost:4241}${khoji.user.unsubscribeFromWorklogEmail.url:/user-profile?tab=setting}")
    public String unsubscribeFromWorklogEmail;

    @Value("${email.user.revoked.velocityTemplate:userRevokedEmailVelocityTemplate.vm}")
    public String userRevokedEmailVelocityTemplate;

    @Value("${email.user.request.access.velocityTemplate:userRequestAccessEmailTemplate.vm}")
    public String userRequestedUserEmailVelocityTemplate;

    /**
     * Email is active only when the required SMTP settings are all present.
     * Their presence IS the enable switch — no separate flag.
     */
    public boolean isConfigured() {
        return StringUtils.hasText(from)
                && StringUtils.hasText(host)
                && StringUtils.hasText(emailUsername)
                && StringUtils.hasText(emailPassword);
    }
}
