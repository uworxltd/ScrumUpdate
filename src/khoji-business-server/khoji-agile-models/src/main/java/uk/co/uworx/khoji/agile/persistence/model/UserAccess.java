/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.persistence.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;


@Entity
@Table(name = "user_access")
@Getter
@Setter
@ToString
@NoArgsConstructor
public class UserAccess {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private KhojiUser user;

    @ManyToOne
    @JoinColumn(name = "instance_id", nullable = false)
    private Instance instance;

    @ManyToOne
    @JoinColumn(name = "instance_user_id")
    private InstanceUser instanceUser;

    @ManyToOne
    @JoinColumn(name = "instance_email")
    private UserAccessCredentials userAccessCredentials;

    public UserAccess(
            KhojiUser user,
            Instance instance,
            UserAccessCredentials userAccessCredentials,
            InstanceUser instanceUser
    )
    {
        this.user = user;
        this.instance = instance;
        this.userAccessCredentials = userAccessCredentials;
        this.instanceUser = instanceUser;
    }
}
