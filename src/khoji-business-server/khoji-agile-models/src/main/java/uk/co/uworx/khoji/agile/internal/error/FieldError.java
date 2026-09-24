package uk.co.uworx.khoji.agile.internal.error;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonRootName;

import java.util.Objects;

@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonRootName(value = "fieldError")
public class FieldError
{

  @JsonProperty("objectName")
  private String objectName;
  @JsonProperty("field")
  private String field;
  @JsonProperty("message")
  private String message;

  public FieldError(String objectName, String field, String message)
  {
    this.objectName = objectName;
    this.field = field;
    this.message = message;
  }

  public FieldError objectName(String objectName)
  {
    this.objectName = objectName;
    return this;
  }

  /**
   * The name of the object with error(s)
   *
   * @return objectName
   */
  public String getObjectName()
  {
    return objectName;
  }

  public void setObjectName(String objectName)
  {
    this.objectName = objectName;
  }

  public FieldError field(String field)
  {
    this.field = field;
    return this;
  }

  /**
   * The name of the field with error(s)
   *
   * @return field
   */
  public String getField()
  {
    return field;
  }

  public void setField(String field)
  {
    this.field = field;
  }

  public FieldError message(String message)
  {
    this.message = message;
    return this;
  }

  /**
   * Detailed message of the field error
   *
   * @return message
   */
  public String getMessage()
  {
    return message;
  }

  public void setMessage(String message)
  {
    this.message = message;
  }

  @Override
  public boolean equals(final Object o)
  {
    if (this == o)
    {
      return true;
    }
    if (o == null || getClass() != o.getClass())
    {
      return false;
    }
    final FieldError that = (FieldError) o;
    return Objects.equals(objectName, that.objectName) &&
            Objects.equals(field, that.field) &&
            Objects.equals(message, that.message);
  }

  @Override
  public int hashCode()
  {
    return Objects.hash(objectName, field, message);
  }
}
