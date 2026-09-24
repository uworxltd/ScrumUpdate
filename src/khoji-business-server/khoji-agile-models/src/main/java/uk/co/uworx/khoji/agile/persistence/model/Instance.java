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
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.time.Instant;

@Entity
@Table(name = "instance")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Instance {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE)
    private Long id;
    private String tenantId;
    private String instanceImageUrl;
    private String instanceName;
    @ManyToOne
    @JoinColumn(name = "workspace_id", nullable = false)
    private Workspace workspace;
    private String platform;
    private Boolean isFavorite;
    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
    @Column(nullable = false)
    private Instant updatedAt = Instant.now();
    @Transient
    private Long featureId;

    public Instance(
            String tenantId,
            String instanceImageUrl,
            String instanceName,
            Workspace workspace,
            String platform,
            Boolean isFavorite
    )
    {
        this.tenantId = tenantId;
        this.instanceImageUrl = instanceImageUrl;
        this.instanceName = instanceName;
        this.workspace = workspace;
        this.platform = platform;
        this.isFavorite = isFavorite;
    }

    public Instance(Long id) {
        this.id = id;
    }
}

