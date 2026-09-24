/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */


package uk.co.uworx.khoji.agile.internal.model.multi.tenant;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.Cache;
import org.hibernate.annotations.CacheConcurrencyStrategy;
import uk.co.uworx.khoji.agile.internal.helper.EncryptionHelper;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import java.io.Serializable;

@Entity
@NoArgsConstructor
@Cache(usage = CacheConcurrencyStrategy.READ_WRITE)
public class TenantUsers implements Serializable
{
  @Id
  @Setter
  @Getter(AccessLevel.NONE)
  private String userEmail;

  @Getter
  @Setter
  @OneToOne
  @JoinColumn(name = "tenant_id")
  private TenantDetails tenantId;

  @Column(name = "jwt_source_token")
  private String JWTSourceToken;

  @Column(name = "jwt_source_refresh_token")
  private String JWTSourceRefreshToken;

  @Getter
  @Setter
  @Column(name = "login_code")
  private String loginCode;

  @Getter
  @Setter
  @Column(name = "zone_info")
  private String zoneInfo;

  public TenantUsers(
          String userEmail,
          TenantDetails tenantId,
          String JWTSourceToken,
          String JWTSourceRefreshToken,
          String zoneInfo,
          String loginCode
  )
  {
    this.userEmail = userEmail;
    this.tenantId = tenantId;
    this.JWTSourceToken = EncryptionHelper.encrypt(JWTSourceToken);
    this.JWTSourceRefreshToken = EncryptionHelper.encrypt(JWTSourceRefreshToken);
    this.zoneInfo = zoneInfo;
    this.loginCode = loginCode;
  }

  public String getUserEmail()
  {
    return  userEmail == null ? null : userEmail;
  }

  public String getJWTSourceToken()
  {
    return EncryptionHelper.decrypt(JWTSourceToken);
  }

  public void setJWTSourceToken(String JWTSourceToken)
  {
    this.JWTSourceToken = EncryptionHelper.encrypt(JWTSourceToken);
  }

  public String getJWTSourceRefreshToken()
  {
    return EncryptionHelper.decrypt(JWTSourceRefreshToken);
  }

  public void setJWTSourceRefreshToken(String JWTSourceRefreshToken)
  {
    this.JWTSourceRefreshToken = EncryptionHelper.encrypt(JWTSourceRefreshToken);
  }
}
