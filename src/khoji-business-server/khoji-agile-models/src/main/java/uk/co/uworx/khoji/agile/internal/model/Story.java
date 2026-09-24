/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.internal.model;

import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.apache.commons.lang3.ArrayUtils;

import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Story Model
 */
@AllArgsConstructor
@NoArgsConstructor
@Log4j2
public class Story extends Issue
{
  private long devTaskCount;
  private double threshold;
  private boolean qualityRisk;
  private long storyAge;
  private double timeSpentToStoryPointVariancePercentage;
  private double timeSpentToOriginalEstimateVariancePercentage;
  private double defectTimePercentage;
  private double aggregatedEstimatedTime;
  private double overEstimatedThresholdTime;
  private double underEstimatedThresholdTime;
  private List<String> missingTasks;
  private double estimateThreshold;



  public Story(String id,
               String name,
               String teamBoard,
               List<TeamBoard> teamBoardMappedList,
               String status,
               Category mappedCategory,
               Category sourceCategory,
               Status mappedStatus,
               Status sourceStatus,
               String dateCreated,
               String dateStarted,
               String dateResolved,
               List<Comment> commentsList,
               double storyPoints,
               ProjectedTime projectedTime,
               TimeSpent timeSpent,
               TimeRemaining timeRemaining,
               Estimates estimates,
               RagStatus ragStatus,
               long storyAge,
               double timeSpentToStoryPointVariancePercentage,
               double timeSpentToOriginalEstimateVariancePercentage)
  {
    super(id, name, teamBoard, teamBoardMappedList, status, mappedCategory, sourceCategory, mappedStatus, sourceStatus, dateCreated, dateStarted, dateResolved, storyPoints, projectedTime, timeSpent, timeRemaining, estimates, ragStatus, commentsList);
    this.storyAge = storyAge;
    this.timeSpentToStoryPointVariancePercentage = timeSpentToStoryPointVariancePercentage;
    this.timeSpentToOriginalEstimateVariancePercentage = timeSpentToOriginalEstimateVariancePercentage;
  }

  /**
   * @return the aggregated estimate time
   */
  public double getAggregatedEstimatedTime()
  {
    return aggregatedEstimatedTime;
  }

  /**
   * Sets the aggregated estimated time
   *
   * @param aggregatedEstimatedTime the aggregated estimated time to set
   */
  public void setAggregatedEstimatedTime(final double aggregatedEstimatedTime)
  {
    this.aggregatedEstimatedTime = aggregatedEstimatedTime;
  }

  /**
   * @return the dev task counr
   */
  public long getDevTaskCount()
  {
    return devTaskCount;
  }

  /**
   * Sets the dev task count
   *
   * @param devTaskCount the dev task count to set
   */
  public void setDevTaskCount(final long devTaskCount)
  {
    this.devTaskCount = devTaskCount;
  }

  public double getUnderEstimatedThresholdTime()
  {
    return underEstimatedThresholdTime;
  }

  public void setUnderEstimatedThresholdTime(double underEstimatedThresholdTime)
  {
    this.underEstimatedThresholdTime = underEstimatedThresholdTime;
  }
  /**
   * @return the quality risk
   */
  public boolean isQualityRisk()
  {
    return qualityRisk;
  }

  /**
   * Sets the quality risk
   *
   * @param qualityRisk the quality risk to set
   */
  public void setQualityRisk(boolean qualityRisk)
  {
    this.qualityRisk = qualityRisk;
  }

  /**
   * @return the threshold
   */
  public Double getThreshold()
  {
    return threshold;
  }

  /**
   * Sets the threshold
   *
   * @param threshold the threshold to set
   */
  public void setThreshold(double threshold)
  {
    this.threshold = threshold;
  }


  /**
   * @return the time spent to story point variance percentage
   */
  public double getTimeSpentToStoryPointVariancePercentage()
  {
    return timeSpentToStoryPointVariancePercentage;
  }

  /**
   * Sets the time spent to story point variance percentage
   *
   * @param timeSpentToStoryPointVariancePercentage the time spent to story point variance percentage to set
   */
  public void setTimeSpentToStoryPointVariancePercentage(final double timeSpentToStoryPointVariancePercentage)
  {
    this.timeSpentToStoryPointVariancePercentage = timeSpentToStoryPointVariancePercentage;
  }

  /**
   * @return the time spent to original estimate variance percentage
   */
  public double getTimeSpentToOriginalEstimateVariancePercentage()
  {
    return timeSpentToOriginalEstimateVariancePercentage;
  }

  /**
   * Sets the time spent to original estimate variance percentage
   *
   * @param timeSpentToOriginalEstimateVariancePercentage the time spent to original estimate variance percentage to set
   */
  public void setTimeSpentToOriginalEstimateVariancePercentage(final double timeSpentToOriginalEstimateVariancePercentage)
  {
    this.timeSpentToOriginalEstimateVariancePercentage = timeSpentToOriginalEstimateVariancePercentage;
  }

  /**
   * @return the story age
   */
  public long getStoryAge()
  {
    return storyAge;
  }

  /**
   * Sets the story age
   *
   * @param storyAge the story age
   */
  public void setStoryAge(final long storyAge)
  {
    this.storyAge = storyAge;
  }

  /**
   * @return the defect time percentage
   */
  public double getDefectTimePercentage()
  {
    return defectTimePercentage;
  }

  /**
   * Sets the defect time percentage
   *
   * @param defectTimePercentage the defect time percentage to set
   */
  public void setDefectTimePercentage(final double defectTimePercentage)
  {
    this.defectTimePercentage = defectTimePercentage;
  }

  /**
   * @return the missing tasks
   */
  public List<String> getMissingTasks()
  {
    return missingTasks;
  }

  /**
   * Sets the missing tasks
   *
   * @param missingTasks the missing tasks
   */
  public void setMissingTasks(final List<String> missingTasks)
  {
    this.missingTasks = missingTasks;
  }

  public double getOverEstimatedThresholdTime()
  {
    return overEstimatedThresholdTime;
  }

  public void setOverEstimatedThresholdTime(double overEstimatedThresholdTime)
  {
    this.overEstimatedThresholdTime = overEstimatedThresholdTime;
  }

  public double getEstimateThreshold()
  {
    return estimateThreshold;
  }

  public void setEstimateThreshold(double estimateThreshold)
  {
    this.estimateThreshold = estimateThreshold;
  }

  @Override
  public String toString()
  {
    return "Story{" +
            "id=" + getId() +
            '}';
  }

  /**
   * Filters attributes of the story and issue object to return a story with only the provided fields
   * Creates a new story with only the specified fields populated.
   *
   * @param fieldNamesToKeep the list of fields to include in filtered story
   * @return updated story with the provided fields only
   */
  public Story filterAttributes(List<String> fieldNamesToKeep)
  {
    Set<String> attributeSet = new HashSet<>(fieldNamesToKeep);
    Set<String> attributeSetWithRootAttributeNamesOnly = getRootFieldNames(fieldNamesToKeep);
    Story story = new Story();

    Class<?> currentClass = getClass();
    while (currentClass != null)
    {
      for (Field field : currentClass.getDeclaredFields())
      {
        field.setAccessible(true);
        String fieldName = field.getName();
        if (attributeSetWithRootAttributeNamesOnly.contains(fieldName))
        {
          copyFieldValue(field, this, story);
        }
      }
      currentClass = currentClass.getSuperclass();
    }

    return story;
  }

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
   * Copies the value of a field to given story.
   *
   * @param field         the field to copy the value from
   * @param filteredStory the story to copy the field value to
   * @param filteredStory the story to copy the field value from
   */
  private void copyFieldValue(Field field, Object originalStory, Object filteredStory)
  {
    Class<?> fieldType = field.getType();
    try
    {
      field.setAccessible(true);
      Object value = field.get(originalStory);
      if (!Modifier.isFinal(field.getModifiers()) && !field.getType().isPrimitive() && !fieldType.isArray() && !fieldType.equals(String.class) && !fieldType.equals(List.class) && !fieldType.equals(Map.class) && !fieldType.equals(Boolean.class))
      {
        Object nestedFilteredObject = value != null ? copyNestedFields(value) : null;
        field.set(filteredStory, nestedFilteredObject);
      }
      else
      {
        field.set(filteredStory, value);
      }
    }
    catch (Exception e)
    {
      // Skip inaccessible fields
      log.warn("Error while accessing field: {} while filtering story object so its being skipped", field.getName(), e);
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
          log.debug("Skipping final or static field: {}", field.getName());
        }
        if (!field.trySetAccessible())
        {
          log.debug("Skipping inaccessible field: {}", field.getName());
        }
        else
        {
          Class<?> fieldType = field.getType();
          Object value = field.get(originalNestedField);
          if (!Modifier.isFinal(field.getModifiers()) && !field.getType().isPrimitive() && !fieldType.isArray() && !fieldType.equals(String.class) && !fieldType.equals(List.class) && !field.equals(Map.class))
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
      log.error("Error while copying values for filtering nested attributes of story", e);
      return null;
    }
  }
}
