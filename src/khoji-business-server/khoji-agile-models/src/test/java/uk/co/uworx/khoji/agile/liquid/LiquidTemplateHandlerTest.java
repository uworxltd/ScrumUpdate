/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */


package uk.co.uworx.khoji.agile.liquid;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mockito;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.ApplicationContext;
import org.springframework.core.io.DefaultResourceLoader;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.test.util.ReflectionTestUtils;
import uk.co.uworx.khoji.agile.common.SpringContextProvider;
import uk.co.uworx.khoji.agile.handler.ConfigHandler;
import uk.co.uworx.khoji.agile.liquid.filter.PropertyValue;
import uk.co.uworx.khoji.agile.liquid.tag.CustomInclude;

import java.io.IOException;

/**
 * Unit Test class for {@link LiquidTemplateHandler}
 */
@ExtendWith(SpringExtension.class)
public class LiquidTemplateHandlerTest
{
  private Fixture fixture;

  @MockBean
  private ApplicationContext applicationContext;

  @BeforeEach
  public void setUp() throws Exception
  {
    fixture = new Fixture();
  }

  @Test
  public void testSimpleTemplateRenderWithFile() throws IOException
  {
    fixture.givenFileNameIs("test.liquid");
    fixture.whenRenderTemplateWithFileIsCalled();
    fixture.thenResultIs("Reports/File/abc");
  }

  @Test
  public void testSimpleTemplateRender()
  {
    fixture.givenTemplateToTestIs("Reports/Test/{{user}}");
    fixture.whenRenderTemplateIsCalled();
    fixture.thenResultIs("Reports/Test/abc");
  }

  @Test
  public void testSimpleTemplateRenderWithDefault()
  {
    fixture.givenTemplateToTestIs("Reports/Test/{{user}}/{{startDate |default: 'DATE'}}");
    fixture.whenRenderTemplateIsCalled();
    fixture.thenResultIs("Reports/Test/abc/DATE");
  }

  @Test
  public void testMalformedTemplateThrowsException()
  {
    Assertions.assertThrows(Exception.class, () -> {
      fixture.givenTemplateToTestIs("{{user}");
      fixture.whenRenderTemplateIsCalled();
    });
  }

  private class Fixture
  {
    private final LiquidTemplateHandler classUnderTest;

    private final JsonNode jsonNode;

    private String result;
    private String templateToTest;
    private String fileName;

    Fixture() throws JsonProcessingException
    {
      classUnderTest = new LiquidTemplateHandler();
      ConfigHandler configHandler = new ConfigHandler();
      configHandler.templatesDirectory = "classpath:liquid/";

      ReflectionTestUtils.setField(SpringContextProvider.class, "context", applicationContext);

      ReflectionTestUtils.setField(classUnderTest, "objectMapper", new ObjectMapper());
      ReflectionTestUtils.setField(classUnderTest, "resourceLoader", new DefaultResourceLoader());
      ReflectionTestUtils.setField(classUnderTest, "configHandler", configHandler);

      Mockito.when(applicationContext.getBean(PropertyValue.class)).thenReturn(new PropertyValue());
      Mockito.when(applicationContext.getBean(CustomInclude.class)).thenReturn(new CustomInclude());

      jsonNode = new ObjectMapper().readTree("{ \"user\" :  \"abc\"}");
    }

    private void givenTemplateToTestIs(String templateToTest)
    {
      this.templateToTest = templateToTest;
    }

    private void givenFileNameIs(String fileName)
    {
      this.fileName = fileName;
    }

    public void whenRenderTemplateIsCalled()
    {
      this.result = classUnderTest.renderTemplate(templateToTest, jsonNode);
    }

    public void whenRenderTemplateWithFileIsCalled() throws IOException
    {
      this.result = classUnderTest.renderTemplateFromFile(fileName, jsonNode);
    }

    private void thenResultIs(String resultToCheck)
    {
      Assertions.assertEquals(result, resultToCheck);
    }
  }
}
