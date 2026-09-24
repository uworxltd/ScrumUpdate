package uk.co.uworx.khoji.agile.config;

import lombok.Getter;
import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;

@Component
@Log4j2
public class KASConfigs {
  @Value("${khoji.analytics.service.base.url:http://localhost:9000/metrics/}")
  private String khojiAnalyticsBaseUrl;

  public String getCompleteEndpointFor(String metric, Map<String, String> queryParamsMap) {
    if (queryParamsMap != null && !queryParamsMap.isEmpty()) {
      StringBuilder queryParams = new StringBuilder();
      boolean firstParam = true;
      for (Map.Entry<String, String> entry : queryParamsMap.entrySet()) {
        queryParams
          .append(firstParam ? "?" : "&")
          .append(entry.getKey())
          .append("=")
          .append(encodeURIComponent(entry.getValue()));

        firstParam = false;
      }
      return khojiAnalyticsBaseUrl + metric + queryParams;
    }
    return khojiAnalyticsBaseUrl + metric;
  }

  private static String encodeURIComponent(String value) {
    try {
      return URLEncoder
        .encode(value, StandardCharsets.UTF_8)
        .replace("+", "%20")
        .replace("%21", "!")
        .replace("%27", "'")
        .replace("%28", "(")
        .replace("%29", ")")
        .replace("%7E", "~");
    } catch (Exception e) {
      log.error("Error occurred while encoding the value: {}", value, e);
      throw new RuntimeException(e);
    }
  }
}
