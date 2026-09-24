/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.internal.datamodel;

public class HistoryItemDataModel
{

  private String issueId;
  private String field;
  private String fieldType;
  private String fieldId;
  private String from;
  private String fromString;
  private String to;
  private String toString;
  private String created;
  private String tmpFromAccountId;
  private String tmpToAccountId;

  public HistoryItemDataModel()
  {
  }

  public HistoryItemDataModel(String issueId,
                              String field,
                              String fieldType,
                              String fieldId,
                              String from,
                              String fromString,
                              String to,
                              String toString,
                              String created,
                              String tmpFromAccountId,
                              String tmpToAccountId)
  {
    this.issueId = issueId;
    this.field = field;
    this.fieldType = fieldType;
    this.fieldId = fieldId;
    this.from = from;
    this.fromString = fromString;
    this.to = to;
    this.toString = toString;
    this.created = created;
    this.tmpFromAccountId = tmpFromAccountId;
    this.tmpToAccountId = tmpToAccountId;
  }

  public String getIssueId()
  {
    return issueId;
  }

  public void setIssueId(String issueId)
  {
    this.issueId = issueId;
  }

  public String getField()
  {
    return field;
  }

  public void setField(String field)
  {
    this.field = field;
  }

  public String getFieldtype()
  {
    return fieldType;
  }

  public void setFieldtype(String fieldType)
  {
    this.fieldType = fieldType;
  }

  public String getFieldId()
  {
    return fieldId;
  }

  public void setFieldId(String fieldId)
  {
    this.fieldId = fieldId;
  }

  public String getFrom()
  {
    return from;
  }

  public void setFrom(String from)
  {
    this.from = from;
  }

  public String getFromString()
  {
    return fromString;
  }

  public void setFromString(String fromString)
  {
    this.fromString = fromString;
  }

  public String getTo()
  {
    return to;
  }

  public void setTo(String to)
  {
    this.to = to;
  }

  public String getToString()
  {
    return toString;
  }

  public void setToString(String toString)
  {
    this.toString = toString;
  }

  public String getCreated()
  {
    return created;
  }

  public void setCreated(String created)
  {
    this.created = created;
  }

  public String getFieldType()
  {
    return fieldType;
  }

  public void setFieldType(final String fieldType)
  {
    this.fieldType = fieldType;
  }

  public String getTmpFromAccountId()
  {
    return tmpFromAccountId;
  }

  public void setTmpFromAccountId(final String tmpFromAccountId)
  {
    this.tmpFromAccountId = tmpFromAccountId;
  }

  public String getTmpToAccountId()
  {
    return tmpToAccountId;
  }

  public void setTmpToAccountId(final String tmpToAccountId)
  {
    this.tmpToAccountId = tmpToAccountId;
  }

  @Override
  public String toString()
  {
    return "HistoryItemDataModel{" +
            "issueId='" + issueId + '\'' +
            ", field='" + field + '\'' +
            ", fieldType='" + fieldType + '\'' +
            ", fieldId='" + fieldId + '\'' +
            ", from='" + from + '\'' +
            ", fromString='" + fromString + '\'' +
            ", to='" + to + '\'' +
            ", toString='" + toString + '\'' +
            ", created='" + created + '\'' +
            ", tmpFromAccountId='" + tmpFromAccountId + '\'' +
            ", tmpToAccountId='" + tmpToAccountId + '\'' +
            '}';
  }
}
