/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.log4j.Log4j2;
import org.apache.commons.text.StringEscapeUtils;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import uk.co.uworx.khoji.agile.internal.model.Release;
import uk.co.uworx.khoji.agile.internal.model.Story;

import java.beans.BeanInfo;
import java.beans.Introspector;
import java.beans.PropertyDescriptor;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedList;
import java.util.List;

@Component
@Log4j2
public class CommonService
{

  /**
   * Escapes special characters in values and returns encoded list of values
   *
   * @param values the values to encode
   * @return the encoded values
   */
  public List<String> encodeValues(List<String> values)
  {
    List<String> encodedValues = new ArrayList<>();
    for (String value : values)
    {
      value = getEncodedValue(value);
      encodedValues.add(value);
    }
    return encodedValues;
  }

  /**
   * Escapes special characters in values and returns encoded list of values
   *
   * @param issues the values to encode
   * @return the encoded values
   */
  public List<Story> encodeIssues(List<Story> issues)
  {
    List<Story> encodedIssues = new ArrayList<>();
    for (Story issue : issues)
    {
      issue.setId(getEncodedValue(issue.getId()));
      issue.setName(getEncodedValue(issue.getName()));
      if (issue.getFixVersions() != null)
      {
        for (Release fixVersion : issue.getFixVersions().getReleases())
        {
          fixVersion.setName(getEncodedValue(fixVersion.getName()));
        }
      }
      encodedIssues.add(issue);
    }
    return encodedIssues;
  }

  private String getEncodedValue(String value)
  {
    return StringEscapeUtils.escapeHtml4(value);
  }

  /**
   * returns value of the field name
   * provided on the object
   * nested field names can be given in form of dot notation
   *
   * @param object    the object to get field value from
   * @param fieldName the field name
   * @return the value of object or null if not found
   */
  public Object getFieldValue(Object object, String fieldName)
  {
    try
    {
      if (fieldName.contains("."))
      {
        int firstDotLocation = fieldName.indexOf('.');
        String childFieldName = fieldName.substring(0, firstDotLocation);
        PropertyDescriptor pd = findPropertyDescriptor(object.getClass(), childFieldName);
        Object childFieldInstance = pd.getReadMethod().invoke(object);

        if (childFieldInstance == null)
        {
          return pd.getReadMethod().invoke(object);
        }
        return getFieldValue(childFieldInstance, fieldName.substring(firstDotLocation + 1));
      }
      else
      {
        PropertyDescriptor pd = findPropertyDescriptor(object.getClass(), fieldName);
        return pd.getReadMethod().invoke(object);
      }
    }
    catch (Exception e)
    {
      log.debug("Error reading field using reflection: {}", e.getMessage());
    }
    return null;
  }

  private PropertyDescriptor findPropertyDescriptor(Class<?> c, String fieldName)
          throws Exception
  {
    BeanInfo beanInfo = Introspector.getBeanInfo(c);
    return Arrays.stream(beanInfo.getPropertyDescriptors())
            .filter(pd -> pd.getName().equals(fieldName))
            .findAny()
            .orElseThrow(() -> new IllegalArgumentException("field not found: " + fieldName));
  }

  @Deprecated
  public <T> List<T> readJsonFile(String filename, Class<T> classOnWhichArrayIsDefined)
  {
    try
    {
      InputStream resource = new ClassPathResource(filename).getInputStream();
      ObjectMapper mapper = new ObjectMapper();
      mapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
      //For a generic array of any class type, the following is used
      //For non-primitives types, [L is used here as defined in JVM docs
      Class<T[]> arrayClass = (Class<T[]>) Class.forName("[L" + classOnWhichArrayIsDefined.getName() + ";");
      T[] objects = mapper.readValue(resource, arrayClass);
      return new LinkedList<>(Arrays.asList(objects));
    }
    catch (IOException | ClassNotFoundException e)
    {
      log.error("Unable to read the configs from file. Reason: {}", e.getMessage(), e);
    }

    return null;
  }

  public <T> T readJsonFromProp(String propKey, TypeReference<T> typeReference)
  {
    ObjectMapper objectMapper = new ObjectMapper();
    try
    {
      return objectMapper.readValue(propKey, typeReference);
    }
    catch (JsonProcessingException e)
    {
      log.error("Unable to read JSON value using property key: {}. Reason: {}", propKey, e.getMessage());
    }
    return null;
  }
}
