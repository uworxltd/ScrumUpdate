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
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

@Entity
@Table(name = "instance_user_config")
@Getter
@Setter
@ToString
@NoArgsConstructor
@AllArgsConstructor
public class InstanceUserConfig
{
  @Id
  @GeneratedValue(strategy = GenerationType.SEQUENCE)
  private long id;
  private String key;
  private String value;
  @JoinColumn(name = "instance_user_id")
  @ManyToOne
  private InstanceUser instanceUser;

  public InstanceUserConfig(String key, String value, InstanceUser instanceUser)
  {
    this.key = key;
    this.value = value;
    this.instanceUser = instanceUser;
  }
}
