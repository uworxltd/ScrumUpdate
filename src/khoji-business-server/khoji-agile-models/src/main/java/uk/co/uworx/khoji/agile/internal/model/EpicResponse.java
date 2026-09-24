/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */


package uk.co.uworx.khoji.agile.internal.model;

public class EpicResponse
{
  private String epicId;
  private String description;

  public EpicResponse()
  {
  }

  public EpicResponse(String epicId, String description)
  {
    this.epicId = epicId;
    this.description = description;
  }

  public String getEpicId()
  {
    return epicId;
  }

  public void setEpicId(String epicId)
  {
    this.epicId = epicId;
  }

  public String getDescription()
  {
    return description;
  }

  public void setDescription(String description)
  {
    this.description = description;
  }
}
