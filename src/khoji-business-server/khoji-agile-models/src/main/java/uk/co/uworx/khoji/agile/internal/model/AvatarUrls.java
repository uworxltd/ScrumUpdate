/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.internal.model;

import java.util.HashMap;
import java.util.Map;

public class AvatarUrls
{

  private String _48x48;
  private String _24x24;
  private String _16x16;
  private String _32x32;
  private Map<String, Object> additionalProperties = new HashMap<String, Object>();

  public String get48x48()
  {
    return _48x48;
  }

  public void set48x48(String _48x48)
  {
    this._48x48 = _48x48;
  }

  public String get24x24()
  {
    return _24x24;
  }

  public void set24x24(String _24x24)
  {
    this._24x24 = _24x24;
  }

  public String get16x16()
  {
    return _16x16;
  }

  public void set16x16(String _16x16)
  {
    this._16x16 = _16x16;
  }

  public String get32x32()
  {
    return _32x32;
  }

  public void set32x32(String _32x32)
  {
    this._32x32 = _32x32;
  }

  public Map<String, Object> getAdditionalProperties()
  {
    return this.additionalProperties;
  }

  public void setAdditionalProperty(String name, Object value)
  {
    this.additionalProperties.put(name, value);
  }

}
