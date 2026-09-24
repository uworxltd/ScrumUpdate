/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.internal.model;

import lombok.Getter;
import lombok.Setter;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Getter
@Setter
public class TeamMembershipStatus {
  @Id
  @GeneratedValue(strategy = GenerationType.AUTO, generator = "hibernate_sequence")
  private Long changeId;

  @ManyToOne
  @JoinColumn(name = "teams_id")
  private Team team;

  @ManyToOne
  @JoinColumn(name = "member_id")
  private Member member;

  @Column(name = "change_type")
  private String  changeType;

  @Column(name = "change_date")
  private LocalDateTime changeDate;

}

