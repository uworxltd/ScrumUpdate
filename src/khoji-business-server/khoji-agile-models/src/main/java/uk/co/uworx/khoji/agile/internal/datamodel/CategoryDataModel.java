/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.internal.datamodel;

public class CategoryDataModel
{
  private int id;
  private String name;
  private String color;
  private int order;

  public CategoryDataModel(final int id, final String name, final String color, final int order)
  {
    this.id = id;
    this.name = name;
    this.color = color;
    this.order = order;
  }
  
  public CategoryDataModel()
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
}
