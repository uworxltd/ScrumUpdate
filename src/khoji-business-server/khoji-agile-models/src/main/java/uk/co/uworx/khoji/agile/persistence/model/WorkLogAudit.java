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

import java.time.Instant;

@Entity
@Table(name = "work_log_audit")
@Getter
@Setter
@ToString
@NoArgsConstructor
@AllArgsConstructor
public class WorkLogAudit {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE)
    private Long id;

    @Column(nullable = false)
    private String uniqueIdentifier;

    @Column
    private String requestedDate;

    @Column
    private String processedInput;

    @Column
    private String generatedOutput;

    @Column
    private String submittedRequest;

    @Column
    private String userName;

    @Column
    private Long instanceUserId;

    public WorkLogAudit(String uniqueIdentifier, String requestedDate, String processedInput, String generatedOutput, String submittedRequest) {
        this.uniqueIdentifier = uniqueIdentifier;
        this.requestedDate = requestedDate;
        this.processedInput = processedInput;
        this.generatedOutput = generatedOutput;
        this.submittedRequest = submittedRequest;
    }

    public WorkLogAudit(String uniqueIdentifier, String requestedDate, String userName, Long instanceUserId) {
        this.uniqueIdentifier = uniqueIdentifier;
        this.requestedDate = requestedDate;
        this.userName = userName;
        this.instanceUserId = instanceUserId;
    }
}
