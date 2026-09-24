/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */


package uk.co.uworx.khoji.agile.internal.model;

import java.util.List;

public class FixVersions
{
  private List<Release> releases;
  private boolean inherited;

  public void setReleases(List<Release> releases)
  {
    this.releases = releases;
  }

  public void setInherited(boolean inherited)
  {
    this.inherited = inherited;
  }

  public List<Release> getReleases()
  {
    return releases;
  }

  public boolean isInherited()
  {
    return inherited;
  }
}
