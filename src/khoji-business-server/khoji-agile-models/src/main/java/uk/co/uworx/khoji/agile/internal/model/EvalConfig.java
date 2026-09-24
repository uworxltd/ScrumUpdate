package uk.co.uworx.khoji.agile.internal.model;


import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import lombok.Getter;
import lombok.Setter;
import lombok.extern.log4j.Log4j2;

@Setter
@Getter
@Log4j2
public class EvalConfig
{
  private String propKey;
  private String propValue;

  public EvalConfig(String propKey, String propValue)
  {
    this.propKey = propKey;
    this.propValue = propValue;
  }

  public static EvalConfig getInstance(String propKey, Object propValue)
  {

    String propValueStr = null;
    try
    {
      propValueStr = new ObjectMapper().writeValueAsString(propValue);
    }
    catch (JsonProcessingException e)
    {
      log.error("Unable to convert prop value to string against propKey: {}. Reason: {}", propKey, e.getMessage());
    }

    return new EvalConfig(propKey, propValueStr);
  }

  /**
   * Returns EvalConfig instance for a String value
   * such that it is parsed correctly
   *
   * @param propKey   of config
   * @param propValue of config
   * @return EvalConfig
   */
  public static EvalConfig getInstanceForString(String propKey, String propValue)
  {
    return new EvalConfig(propKey, propValue);
  }

  /**
   * Parses json objects that contain
   * date time values
   *
   * @param propKey
   * @param propValue
   * @return
   */
  public static EvalConfig getInstanceForDateTime(String propKey, Object propValue)
  {

    String propValueStr = null;
    try
    {
      ObjectMapper mapper = new ObjectMapper();
      mapper.registerModule(new JavaTimeModule());
      propValueStr = mapper.writeValueAsString(propValue);
    }
    catch (JsonProcessingException e)
    {
      log.error("Unable to convert prop value with date time to string against propKey: {}. Reason: {}", propKey, e.getMessage());
    }

    return new EvalConfig(propKey, propValueStr);
  }

}
