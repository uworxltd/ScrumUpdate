/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.persistence.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.SequenceGenerator;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.time.Instant;

@Entity
@Table(name = "identity_provider")
@Getter
@Setter
@ToString
@NoArgsConstructor
@AllArgsConstructor
public class IdentityProvider
{

  @Id
  @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "identity_provider_seq")
  @SequenceGenerator(
      name = "identity_provider_seq",
      sequenceName = "identity_provider_seq",
      allocationSize = 50
  )
  private Long id;

  @ManyToOne
  @JoinColumn(name = "user_id", nullable = false)
  private KhojiUser user;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private Provider provider;

  @Column(nullable = false)
  private String providerAccountId;

  private String loginCode;

  private String sourceAccessToken;

  private String sourceRefreshToken;

  @Column(nullable = false, updatable = false)
  private Instant createdAt = Instant.now();

  @Column(nullable = false)
  private Instant updatedAt = Instant.now();

  public IdentityProvider(KhojiUser user, Provider provider, String providerAccountId, String loginCode, String sourceAccessToken, String sourceRefreshToken)
  {
    this.user = user;
    this.provider = provider;
    this.providerAccountId = providerAccountId;
    this.loginCode = loginCode;
    this.sourceAccessToken = sourceAccessToken;
    this.sourceRefreshToken = sourceRefreshToken;
  }
}
