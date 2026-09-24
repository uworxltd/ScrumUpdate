/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.internal.model;

import java.io.Serializable;
import java.util.Map;
import java.util.TreeMap;

public class WorkLogDistribution implements Serializable
{
  private Map<String,Object> values = new TreeMap<>();
  private Map<String,Object> others = new TreeMap<>();

  /**
   * @return the values distribution
   */
  public Map<String, Object> getValues()
  {
    return values;
  }

  /**
   * sets the values distribution
   * @param values the values to set
   */
  public void setValues(Map<String, Object> values)
  {
    this.values = values;
  }

  /**
   * @return the others distribution
   */
  public Map<String, Object> getOthers()
  {
    return others;
  }

  /**
   * sets the others distribution
   * @param others the distribution to set
   */
  public void setOthers(Map<String, Object> others)
  {
    this.others = others;
  }
}
