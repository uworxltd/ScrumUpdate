/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */



package uk.co.uworx.khoji.agile.internal.model;

import lombok.AllArgsConstructor;
import lombok.Data;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;

/**
 * The MemberAPIResponse class stores the member along with the status (Joined, Revoked)
 * */
@Data
@AllArgsConstructor
public class MemberAPIResponse {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO, generator = "hibernate_sequence")
    private Long id;

    @Transient
    private String fullName;

    @NotBlank(message = "{member.firstName.notBlank}")
    private String firstName;

    @NotBlank(message = "{member.lastName.notBlank}")
    private String lastName;

    private String middleName;

    @Email(message = "{member.email.validFormat}")
    private String memberEmail;

    private String accountId;

    @OneToOne
    @NotNull(message = "{member.memberRole.notBlank}")
    private Role role;

    @NotNull(message = "{member.isKhojiUser.notNull}")
    private boolean iskhojiUser;

    @OneToOne
    @JoinColumn(name = "locnId")
    @NotNull(message = "{member.owningOrganization.notBlank}")
    private Location location;

    private List<UserStatus> userStatuses;
}
