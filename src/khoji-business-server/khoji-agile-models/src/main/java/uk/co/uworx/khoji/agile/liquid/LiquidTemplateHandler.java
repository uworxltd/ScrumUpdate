
/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */


package uk.co.uworx.khoji.agile.liquid;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import liqp.Template;
import liqp.filters.Date;
import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Component;
import org.springframework.util.Assert;
import org.springframework.util.StreamUtils;
import uk.co.uworx.khoji.agile.handler.ConfigHandler;

import java.io.IOException;
import java.nio.charset.Charset;

@Component
@Log4j2
public class LiquidTemplateHandler
{
  @Autowired
  private ObjectMapper objectMapper;
  @Autowired
  private ResourceLoader resourceLoader;

  @Autowired
  private ConfigHandler configHandler;

  static {

    Date.addDatePattern("yyyy-MM-dd");
  }

  /**
   * This method renders given file template using Liquid syntax.
   *
   * @param fileName name of file to be loaded
   * @param value    payload to be used for template resolving
   */
  public String renderTemplateFromFile(String fileName, Object value) throws IOException
  {
    Assert.notNull(fileName, "Template File must be not null.");
    Assert.notNull(value, "Template payload must be not null.");

    Resource resource = resourceLoader.getResource(configHandler.templatesDirectory + fileName);
    String fileContent = StreamUtils.copyToString(resource.getInputStream(), Charset.defaultCharset());

    if (log.isDebugEnabled())
    {
      log.debug("Rendering template file name :{}", fileName);
    }

    return renderTemplate(fileContent, value);
  }

  /**
   * This method renders given template using Liquid syntax.
   *
   * @param template extended url template
   * @param value    payload to be used for template resolving
   */
  public String renderTemplate(String template, Object value)
  {
    Assert.notNull(template, "Template must be not null.");
    Assert.notNull(value, "template payload must be not null.");

    if (log.isDebugEnabled())
    {
      log.debug("Using payload : {}", value);
    }
    Template liquidTemplate = TemplateBuilder.fromPayload(template);
    return liquidTemplate.render(getJsonString(value));
  }

  public String getJsonString(Object value)
  {
    objectMapper.registerModule(new JavaTimeModule());
    try
    {
      return objectMapper.writeValueAsString(value);
    }
    catch (JsonProcessingException e)
    {
      log.error("Error occurred in converting template payload : {}", value);
      throw new RuntimeException("Exception occurred in converting template payload ", e);
    }
  }
}
