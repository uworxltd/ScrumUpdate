package uk.co.uworx.khoji.agile.internal.helper;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.log4j.Log4j2;
import uk.co.uworx.khoji.agile.internal.error.ServiceError;
import uk.co.uworx.khoji.agile.internal.error.ServiceException;

import java.util.List;

@Log4j2
public class JsonDeSerializer
{
  public <T> List<T> deserializeJson(String json, TypeReference<List<T>> typeReference)
  {
    if (json == null || json.isEmpty())
    {
      return List.of();
    }

    try
    {
      return new ObjectMapper().readValue(json, typeReference);
    }
    catch (Exception e)
    {
      log.error(e);
      throw new ServiceException(ServiceError.R0409);
    }
  }
}
