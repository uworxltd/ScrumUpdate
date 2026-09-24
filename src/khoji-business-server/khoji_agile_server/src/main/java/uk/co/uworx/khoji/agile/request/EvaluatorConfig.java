/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.request;

import lombok.Data;

/****
 * Request model to get data from v11
 */
@Data
public class EvaluatorConfig
{
  private String propKey;
  private String propValue;
}
