/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.internal.model;

import java.util.List;

public class Category
{
  private int id;
  private String name;
  private String color;
  private int order;
  private List<Double> applicableStatusIds;

  public Category()
  {
  }

  public Category(String name)
  {
    this.name = name;
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

  public int getOrder()
  {
    return order;
  }

  public void setOrder(int order)
  {
    this.order = order;
  }

  public int getId()
  {
    return id;
  }

  public void setId(int id)
  {
    this.id = id;
  }

  public List<Double> getApplicableStatusIds()
  {
    return applicableStatusIds;
  }

  public void setApplicableStatusIds(List<Double> applicableStatusIds)
  {
    this.applicableStatusIds = applicableStatusIds;
  }
}
