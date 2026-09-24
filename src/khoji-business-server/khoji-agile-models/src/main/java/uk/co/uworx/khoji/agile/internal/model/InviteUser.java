/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.internal.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import uk.co.uworx.khoji.agile.persistence.model.InstanceUser;
import uk.co.uworx.khoji.agile.persistence.model.UserAccess;


/**
 * Invite a user model
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class InviteUser
{
  private InstanceUser instanceUser;
}
