/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.stats.provider.jira.helper;

import com.fasterxml.jackson.core.type.TypeReference;

import java.util.List;

public interface IJiraResponseTransformer
{
  Object transformObj(Object response, String fileName, String templatePath, TypeReference typeReference);

  Object transformObj(Object response, String fileName, TypeReference typeReference);

  List<Object> transformList(Object response, String fileName, String templatePath, TypeReference typeReference);

  List<Object> transformList(Object response, String fileName, TypeReference typeReference);

  /**
   * This is a very generic function just provide the required fields and this would take care of the rest
   * other method defined in this class also works but are very hard to understand, debug at-least for me
   * and throws very weired response/exceptions
   * NOTE: this will work for direct object mapping to implement list this will need to be updated
   *
   * @param response that needs transformation
   * @param fileName path to JSON spec file
   * @param clazz class to map to
   * @return Object mapped to T clazz
   * @param <T> generic
   * @see JiraClientImpl:210
   */
  <T> T transformObject(Object response, String fileName, Class<T> clazz);
}
