package uk.co.uworx.khoji.agile.internal.model.request;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Getter;
import lombok.Setter;
import org.springframework.cglib.core.Local;
import org.springframework.web.bind.annotation.GetMapping;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Getter
@Setter
public class PostWorkLogDataClientRequest
{

  private String comment;
  private String started;
  private double timeSpentSeconds;


  public static String createWorklogPayload(
          String commentText,
          LocalDateTime started,
          double timeSpentSeconds,
          String timeZone
  ) throws JsonProcessingException
  {
    PostWorkLogDataClientRequest payload = new PostWorkLogDataClientRequest();

    payload.setComment(commentText);

    OffsetDateTime offsetDateTime = started.atOffset(ZoneOffset.UTC);
    String formattedStarted = offsetDateTime.format(DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSSZ")); // Use 'Z' instead of 'XXX'

    ZonedDateTime original = ZonedDateTime.parse(formattedStarted, DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSSZ"));
    ZonedDateTime converted = original.withZoneSameInstant(ZoneId.of(timeZone))
            .withHour(9)
            .withMinute(0)
            .withSecond(0)
            .withNano(0);
    String convertedTime = converted.format(DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSSZ"));
    payload.setStarted(convertedTime);

    payload.setTimeSpentSeconds(timeSpentSeconds);

    ObjectMapper objectMapper = new ObjectMapper();
    return objectMapper.writeValueAsString(payload);
  }

}

