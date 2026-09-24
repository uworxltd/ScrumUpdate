/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */


package uk.co.uworx.khoji.agile.liquid.tag;

import liqp.Template;
import liqp.TemplateContext;
import liqp.nodes.LNode;
import liqp.tags.Tag;
import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Component;
import org.springframework.util.StreamUtils;
import uk.co.uworx.khoji.agile.handler.ConfigHandler;
import uk.co.uworx.khoji.agile.liquid.TemplateBuilder;

import java.nio.charset.Charset;

/**
 * Spring aware custom include tag implementation.
 */
@Component
@Log4j2
public class CustomInclude extends Tag
{
  public static final String TAG_NAME = "include_c";
  public static final String INCLUDES_DIRECTORY_KEY = "liqp@includes_directory";
  public static String DEFAULT_EXTENSION = ".liquid";

  @Autowired
  private ResourceLoader resourceLoader;

  @Autowired
  private ConfigHandler configHandler;

  public CustomInclude()
  {
    super(TAG_NAME);
  }

  @Override
  public Object render(TemplateContext context, LNode... nodes)
  {

    try
    {
      String includeResource = super.asString(nodes[0].render(context), context);
      String extension = DEFAULT_EXTENSION;
      if (includeResource.indexOf('.') > 0)
      {
        extension = "";
      }

      includeResource = includeResource.replaceAll("'", "");

      String includeResourceContent;
      String includesDirectory = (String) context.get(INCLUDES_DIRECTORY_KEY);

      if (includesDirectory != null)
      {
        Resource resource = resourceLoader.getResource(includeResource + includeResource + extension);
        includeResourceContent = StreamUtils.copyToString(resource.getInputStream(), Charset.defaultCharset());
      }
      else
      {
        Resource resource = resourceLoader.getResource(configHandler.defaultIncludesDirectory + includeResource + extension);
        includeResourceContent = StreamUtils.copyToString(resource.getInputStream(), Charset.defaultCharset());
      }

      Template template = TemplateBuilder.fromContext(context, includeResourceContent);

      // check if there's a optional "with expression"
      if (nodes.length > 1)
      {
        Object value = nodes[1].render(context);
        context.put(includeResource, value);
      }

      return template.render(context.getVariables());

    }
    catch (Exception e)
    {
      log.error("An error occurred while parsing in liquid file ", e);
      return "";
    }
  }
}
