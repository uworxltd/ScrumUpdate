/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.persistence.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

@Entity
@Table(name = "scrum_update_audit")
@Getter
@Setter
@ToString
@NoArgsConstructor
@AllArgsConstructor
public class ScrumUpdateAudit {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE)
    private Long id;

    @Column(nullable = false)
    private String uniqueIdentifier;

    @Column
    private String yesterdayDate;

    @Column
    private String todayDate;

    @Column(columnDefinition = "TEXT")
    private String processedInput;

    @Column(columnDefinition = "TEXT")
    private String generatedOutput;

    @Column
    private String userName;

    @Column
    private Long instanceUserId;

    public ScrumUpdateAudit(String uniqueIdentifier, String yesterdayDate, String todayDate, String userName, Long instanceUserId) {
        this.uniqueIdentifier = uniqueIdentifier;
        this.yesterdayDate = yesterdayDate;
        this.todayDate = todayDate;
        this.userName = userName;
        this.instanceUserId = instanceUserId;
    }
}
