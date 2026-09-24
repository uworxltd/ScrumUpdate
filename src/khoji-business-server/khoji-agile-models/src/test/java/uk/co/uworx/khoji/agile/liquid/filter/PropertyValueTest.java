/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */


package uk.co.uworx.khoji.agile.liquid.filter;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.springframework.core.env.Environment;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.test.util.ReflectionTestUtils;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Unit Test class for {@link PropertyValue}
 */
@ExtendWith(SpringExtension.class)
public class PropertyValueTest
{
  private Fixture fixture;
  
  @Mock
  private Environment environment;
  
  @BeforeEach
  public void setUp() throws Exception
  {
    fixture = new Fixture();
  }

  @Test
  public void testApplyFilterWithDefaultValue()
  {
    fixture.givenPropertyKey("analysis");
    fixture.givenPropertyValue("false");
    fixture.givenEnvProperty();
    fixture.whenApplyFunctionIsCalled();
    fixture.thenReturnValue("false");
  }

  @Test
  public void testApplyFilterWithDefaultValueNull()
  {
    fixture.givenPropertyKey("quickSearch");
    fixture.givenPropertyValue("true");
    fixture.givenEnvProperty();
    fixture.whenApplyFunctionIsCalledWithOnlyKey();
    fixture.thenReturnValue("true");
  }

  private class Fixture
  {
    private PropertyValue classUnderTest;
    private Object propertyKey;
    private Object propertyValue;
    private Object result;

    Fixture()
    {
      environment = mock(Environment.class);
      classUnderTest = new PropertyValue();
      ReflectionTestUtils.setField(classUnderTest, "environment", environment);
    }

    private void givenPropertyKey(final String key)
    {
      propertyKey = key;
    }

    private void givenPropertyValue(final String value)
    {
      propertyValue = value;
    }

    private void whenApplyFunctionIsCalled()
    {
      result = classUnderTest.apply(propertyKey, null, propertyValue);
    }

    private void whenApplyFunctionIsCalledWithOnlyKey()
    {
      result = classUnderTest.apply(propertyKey, null);
    }

    private void givenEnvProperty()
    {
      when(environment.getProperty(anyString(), anyString())).thenReturn(propertyValue.toString());
      when(environment.getProperty(anyString())).thenReturn(propertyValue.toString());
    }

    private void thenReturnValue(final String value)
    {
      Assertions.assertEquals(result.toString(), value);
    }
  }
}
