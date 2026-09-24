/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.internal.datamodel;

public class CommentDataModel
{
  private String id;
  private CommentAuthorDataModel author;
  private String body;
  private String created;
  private String updated;

  public CommentDataModel(final String id, final CommentAuthorDataModel author, final String body, final String created, final String updated)
  {
    this.id = id;
    this.author = author;
    this.body = body;
    this.created = created;
    this.updated = updated;
  }

  public CommentAuthorDataModel getAuthor()
  {
    return author;
  }

  public void setAuthor(final CommentAuthorDataModel author)
  {
    this.author = author;
  }

  public String getBody()
  {
    return body;
  }

  public void setBody(final String body)
  {
    this.body = body;
  }

  public String getCreated()
  {
    return created;
  }

  public void setCreated(final String created)
  {
    this.created = created;
  }

  public String getUpdated()
  {
    return updated;
  }

  public void setUpdated(final String updated)
  {
    this.updated = updated;
  }

  public String getId()
  {
    return id;
  }

  public void setId(String id)
  {
    this.id = id;
  }
}
