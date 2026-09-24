/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.persistence.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

@Entity
@Table(name = "user_access_credentials")
@Getter
@Setter
@ToString
@NoArgsConstructor
@AllArgsConstructor
public class UserAccessCredentials {
    @Id
    private String email;
    private String accessToken;
    private String refreshToken;
}

