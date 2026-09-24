/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */


package uk.co.uworx.khoji.agile.liquid;

import liqp.Template;
import liqp.TemplateContext;
import liqp.TemplateParser;
import uk.co.uworx.khoji.agile.liquid.filter.PropertyValue;
import uk.co.uworx.khoji.agile.liquid.tag.CustomInclude;

import static uk.co.uworx.khoji.agile.common.SpringContextProvider.getBean;

/**
 * Helper class to be used to build Liquid Template
 */
public class TemplateBuilder
{
  public static Template fromPayload(String payload)
  {
    TemplateParser templateParser = new TemplateParser
            .Builder()
            .withFilter(getBean(PropertyValue.class))
            .withTag(getBean(CustomInclude.class))
            .build();

    return templateParser.parse(payload);
  }

  public static Template fromContext(TemplateContext context, String payload)
  {
    TemplateParser templateParser = new TemplateParser
            .Builder()
            .withFilter(getBean(PropertyValue.class))
            .withTag(getBean(CustomInclude.class))
            .build();

    return templateParser.parse(payload);
  }

}
