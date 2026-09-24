/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */


package uk.co.uworx.khoji.agile.internal.service;

import uk.co.uworx.khoji.agile.internal.model.CustomField;
import uk.co.uworx.khoji.agile.internal.model.CustomFieldTemplateParameters;
import uk.co.uworx.khoji.agile.internal.model.KhojiCustomField;

import java.util.List;
import java.util.Optional;

public interface CustomFieldsService
{
  /**
   * Finds and returns all custom fields present in the system
   * @return List of All Custom Fields
   */
  List<CustomField> getAllCustomFields();

  /**
   * Finds custom field based on key provided
   * @param key
   * @return Matched Custom Field
   */
  Optional<CustomField> findCustomFieldByKey(KhojiCustomField key);

  /**
   * Checks if Story Points and High-Level Estimate custom fields share identical values.
   * @return true if both are present and match, false otherwise.
   */

  boolean hasSameCustomFieldForStoryPointAndHLE();

  /**
   * Sets generic custom fields in the given parameters based on existing fields.
   * @param customFieldParameters
   */

  void setGenericCustomFields(CustomFieldTemplateParameters customFieldParameters);
}
