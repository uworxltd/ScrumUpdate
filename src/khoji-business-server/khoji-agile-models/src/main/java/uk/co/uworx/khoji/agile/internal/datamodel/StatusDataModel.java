/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.internal.datamodel;

public class StatusDataModel
{
  private double id;
  private String name;
  private double order;
  private boolean inferred;

  public StatusDataModel(final double id, final String name, final double order, final boolean inferred)
  {
    this.id = id;
    this.name = name;
    this.order = order;
    this.inferred = inferred;
  }
  
  public StatusDataModel()
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

  public double getOrder()
  {
    return order;
  }

  public void setOrder(double order)
  {
    this.order = order;
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
}
