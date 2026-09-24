package uk.co.uworx.khoji.agile.internal.helper;


import lombok.extern.log4j.Log4j2;
import org.apache.commons.lang3.ArrayUtils;

import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/***
 * Model helper class to send only required attributes in response
 */
@Log4j2
public class AttributeMapper
{
  /**
   * Filters attributes of the object to return a new object with only the provided fields.
   * @param originalObject  object to copy value from
   * @param <T>              the type of the object to filter
   * @param fieldNamesToKeep the list of fields to include in the filtered object
   * @return an updated object with the provided fields only
   */
  public <T> T filterAttributes(List<String> fieldNamesToKeep, Class<T> targetType, Object originalObject)
  {
    Set<String> attributeSetWithRootAttributeNamesOnly = getRootFieldNames(fieldNamesToKeep);

    Class<?> currentClass = targetType;
    try
    {
      T filteredObject = (T) currentClass.getDeclaredConstructor().newInstance();

      while (currentClass != null)
      {
        for (Field field : currentClass.getDeclaredFields())
        {
          field.setAccessible(true);
          String fieldName = field.getName();
          if (attributeSetWithRootAttributeNamesOnly.contains(fieldName))
          {
            copyFieldValue(field, originalObject, filteredObject);
          }
        }
        currentClass = currentClass.getSuperclass();
      }
      return filteredObject;
    }
    catch (Exception e)
    {
      log.error("Handle any exceptions that occur during object creation or field copying for {}", targetType.getName());
      return null;
    }
  }

  /***
   * Method to get field names from table config
   * @param fieldNamesToKeep
   * @return
   */
  private Set<String> getRootFieldNames(List<String> fieldNamesToKeep)
  {
    return fieldNamesToKeep.stream().filter(Objects::nonNull).map(fieldName -> {
      if (fieldName.contains("."))
      {
        String[] nestedFieldNames = fieldName.split("\\.");

        return ArrayUtils.isNotEmpty(nestedFieldNames) ? nestedFieldNames[0] : fieldName;
      }
      return fieldName;
    }).collect(Collectors.toSet());
  }

  /**
   * Copies the value of a field to given object.
   *
   * @param field          the field to copy the value from
   * @param filteredObject the object to copy the field value to
   * @param originalObject object to copy the field value from
   */
  private void copyFieldValue(Field field, Object originalObject, Object filteredObject)
  {
    Class<?> fieldType = field.getType();
    try
    {
      field.setAccessible(true);
      Object value = field.get(originalObject);
      if (!Modifier.isFinal(field.getModifiers()) && !field.getType().isPrimitive() && !fieldType.isArray() && !fieldType.equals(String.class) && !fieldType.equals(List.class) && !fieldType.equals(Map.class) && !fieldType.equals(Long.class) && !fieldType.equals(Boolean.class))
      {
        Object nestedFilteredObject = value != null ? copyNestedFields(value) : null;
        field.set(filteredObject, nestedFilteredObject);
      }
      else
      {
        field.set(filteredObject, value);
      }
    }
    catch (Exception e)
    {
      // Skip inaccessible fields
      log.warn("Error while accessing field: {} while filtering object so its being skipped", field.getName(), e);
    }
  }

  /**
   * Recursively copies the nested fields of a given field
   *
   * @param originalNestedField
   * @return a new field with the filtered nested fields
   */
  private Object copyNestedFields(Object originalNestedField)
  {
    Class<?> nestedFieldClass = originalNestedField.getClass();
    try
    {
      Object filteredNestedObject = null;
      filteredNestedObject = nestedFieldClass.getDeclaredConstructor().newInstance();
      for (Field field : nestedFieldClass.getDeclaredFields())
      {
        if (Modifier.isFinal(field.getModifiers()) || Modifier.isStatic(field.getModifiers()))
        {
          if (log.isDebugEnabled())
          {
            log.debug("Skipping final or static field: {}", field.getName());
          }
          else
          {
            System.out.println("Skipping final or static field: " + field.getName());
          }
        }
        if (!field.trySetAccessible())
        {
          if (log.isDebugEnabled())
          {
            log.debug("Skipping inaccessible field: {}", field.getName());
          }
          else
          {
            System.out.println("Skipping inaccessible field : " + field.getName());
          }
        }
        else
        {
          Class<?> fieldType = field.getType();
          Object value = field.get(originalNestedField);
          if (!Modifier.isFinal(field.getModifiers()) && !field.getType().isPrimitive() && !fieldType.isArray() && !fieldType.equals(String.class) && !fieldType.equals(List.class) && !fieldType.equals(Map.class) && !fieldType.equals(LocalDate.class) && !fieldType.equals(Boolean.class))
          {
            Object nestedFilteredObject = value != null ? copyNestedFields(value) : null;
            field.set(filteredNestedObject, nestedFilteredObject);
          }
          else
          {
            field.set(filteredNestedObject, value);
          }
        }
      }
      return filteredNestedObject;
    }
    catch (Exception e)
    {
      log.error("Error while copying values for filtering nested attributes of object ", e);
      return null;
    }
  }
}
