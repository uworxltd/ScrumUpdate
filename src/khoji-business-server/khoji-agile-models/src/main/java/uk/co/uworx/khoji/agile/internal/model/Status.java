/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.internal.model;

public class Status
{
  private double id;
  private String name;
  private String color;
  private double order;

  private Category category;
  private String[] issueTypesApplicable;

  private boolean inferred;

  public Status(String name)
  {
    this.name = name;
  }

  public Status()
  {
  }

  public String getName()
  {
    return name;
  }

  public void setName(String name)
  {
    this.name = name;
  }

  public String getColor()
  {
    return color;
  }

  public void setColor(String color)
  {
    this.color = color;
  }

  public double getOrder()
  {
    return order;
  }

  public void setOrder(double order)
  {
    this.order = order;
  }

  public Category getCategory()
  {
    return category;
  }

  public void setCategory(Category category)
  {
    this.category = category;
  }

  public boolean isInferred()
  {
    return inferred;
  }

  public void setInferred(boolean inferred)
  {
    this.inferred = inferred;
  }

  public double getId()
  {
    return id;
  }

  public void setId(double id)
  {
    this.id = id;
  }

  public String[] getIssueTypesApplicable()
  {
    return issueTypesApplicable;
  }

  public void setIssueTypesApplicable(String[] issueTypesApplicable)
  {
    this.issueTypesApplicable = issueTypesApplicable;
  }
}
