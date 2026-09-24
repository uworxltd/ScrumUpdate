/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.internal.model;


import com.fasterxml.jackson.annotation.JsonIgnore;

public class Comment
{
  private String id;
  private Author author;
  private String body;
  @JsonIgnore
  private Author updateAuthor;
  private String created;
  private String updated;
  @JsonIgnore
  private String source;
  @JsonIgnore
  private String target;

  public String getId()
  {
    return id;
  }

  public void setId(String id)
  {
    this.id = id;
  }

  public Author getAuthor()
  {
    return author;
  }

  public void setAuthor(Author author)
  {
    this.author = author;
  }

  public String getBody()
  {
    return body;
  }

  public void setBody(String body)
  {
    this.body = body;
  }

  public Author getUpdateAuthor()
  {
    return updateAuthor;
  }

  public void setUpdateAuthor(Author updateAuthor)
  {
    this.updateAuthor = updateAuthor;
  }

  public String getCreated()
  {
    return created;
  }

  public void setCreated(String created)
  {
    this.created = created;
  }

  public String getUpdated()
  {
    return updated;
  }

  public void setUpdated(String updated)
  {
    this.updated = updated;
  }

  public String getSource()
  {
    return source;
  }

  public void setSource(String source)
  {
    this.source = source;
  }

  public String getTarget()
  {
    return target;
  }

  public void setTarget(String target)
  {
    this.target = target;
  }
}
