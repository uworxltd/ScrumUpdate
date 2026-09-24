/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */


package uk.co.uworx.khoji.agile.liquid.filter;

import liqp.TemplateContext;
import liqp.filters.Filter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

/**
 * Spring aware propertyValue filter. This filter can be used where we need to load
 * a value in liquid template from properties.
 */
@Component
public class PropertyValue extends Filter
{
  public static final String FILTER_NAME = "propertyValue";

  @Autowired
  private Environment environment;

  public PropertyValue()
  {
    super(FILTER_NAME);
  }

  @Override
  public Object apply(Object value, TemplateContext templateContext, Object... params)
  {
    String propertyKey = super.asString(value, templateContext);

    String defaultValue = null;
    if (params.length > 0)
      defaultValue = super.asString(super.get(0, params), templateContext);

    if (propertyKey.isEmpty())
    {
      return null;
    }

    return defaultValue != null ? environment.getProperty(propertyKey, defaultValue) : environment.getProperty(propertyKey);
  }

}
