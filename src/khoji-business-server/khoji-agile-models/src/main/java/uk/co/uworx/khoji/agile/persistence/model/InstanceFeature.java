/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.persistence.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.time.Instant;

@Entity
@Table(name = "instance_feature")
@Getter
@Setter
@ToString
@NoArgsConstructor
@AllArgsConstructor
public class InstanceFeature {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "instance_id", nullable = false)
    @ToString.Exclude
    private Instance instance;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "feature_id", nullable = false)
    @ToString.Exclude
    private Feature feature;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(nullable = false)
    private Instant updatedAt = Instant.now();

    public InstanceFeature(Instance instance, Feature feature)
    {
        this.instance = instance;
        this.feature = feature;
    }
}

