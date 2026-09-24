/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */


package uk.co.uworx.khoji.agile.internal.service;

import uk.co.uworx.khoji.agile.persistence.model.AccessLevel;

import java.util.List;

public interface AccessLevelDataService
{
  AccessLevel findByCode(String code);

  List<String> getAllowedActionsExpensiveOp(String userCode);

  List<String> getAllowedActions(String userCode);

  AccessLevel getDefaultAccess();

  List<AccessLevel> getAllAccessLevels();
}
