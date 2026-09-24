/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.internal.model.request;

import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class MembershipStatusResponse
{
  private Long memberAddedCount;
  private Long memberRemovedCount;
  private List<String> messages;
  private String subMessage;

}
