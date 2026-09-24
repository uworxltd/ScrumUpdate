package uk.co.uworx.khoji.agile.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
@Log4j2
public class MappingService
{
  @Autowired
  ObjectMapper mapper;

  /**
   * Reading complex structure prop values
   *
   * @param propKey
   * @param typeReference
   * @param <T>
   * @return
   */
  public <T> T readJsonFromProp(String propKey, TypeReference<T> typeReference)
  {
    ObjectMapper objectMapper = new ObjectMapper();
    return getTypeReference(propKey, typeReference, objectMapper);
  }

  public <T> T readJsonWithMapFromProp(Object object, TypeReference<T> typeReference)
  {
    ObjectMapper objectMapper = new ObjectMapper();
    try
    {
      return getTypeReference(objectMapper.writeValueAsString(object), typeReference, objectMapper);
    }
    catch (JsonProcessingException e)
    {
      log.error("Unable to parse map value, Reason: {}", e.getMessage());
    }
    return null;
  }

  /**
   * Parses json objects that contain
   * date time values
   *
   * @param propKey       to convert
   * @param typeReference converted to
   * @param <T>           type reference
   * @return T object
   */
  public <T> T readJsonFromPropWithDate(String propKey, TypeReference<T> typeReference)
  {
    ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());
    return getTypeReference(propKey, typeReference, objectMapper);
  }

  private <T> T getTypeReference(String propKey, TypeReference<T> typeReference, ObjectMapper objectMapper)
  {
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

  public String getJsonString(Object value)
  {
    try
    {
      return mapper.writeValueAsString(value);
    }
    catch (JsonProcessingException e)
    {
      log.error("Error occurred in converting Object to JSON string : {}", value);
      return null;
    }
  }
}
