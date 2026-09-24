package uk.co.uworx.khoji.agile.config;

import jakarta.annotation.PostConstruct;
import lombok.Getter;
import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.Arrays;

/**
 * Configs for new user's Default Role and Organization
 */

@Getter
@Log4j2
@Component
public class KhojiUsersConfig
{
  @Autowired
  private Environment environment;

  @Value("${default.khoji.role:TM}")
  public String defaultKhojiRole;

  @Value("${default.khoji.organization:1}")
  public String defaultKhojiOrganization;

  @Value("${khoji.basicAuthUsername:}")
  public String basicAuthUsername;

  @Value("${khoji.basicAuthPassword:}")
  public String basicAuthPassword;

  /**
   * Basic auth for the APP authority is fail-closed: when
   * KHOJI_BASICAUTHUSERNAME / KHOJI_BASICAUTHUSERPASSWORD are not configured,
   * every APP-authority endpoint returns 401. In non-dev profiles the app
   * refuses to start, because inter-service callers (KGS, KSS), health probes
   * and test automation hard-depend on these credentials.
   */
  @PostConstruct
  private void validateBasicAuthConfig()
  {
    if (StringUtils.hasText(basicAuthUsername) && StringUtils.hasText(basicAuthPassword))
    {
      log.info("Basic auth enabled for APP authority user: {}", basicAuthUsername);
      return;
    }

    String message = "KHOJI_BASICAUTHUSERNAME / KHOJI_BASICAUTHUSERPASSWORD are not configured; "
        + "APP-authority endpoints (inter-service calls, health probes) will return 401";

    boolean isDev = Arrays.asList(environment.getActiveProfiles()).contains("dev");
    if (isDev)
    {
      log.warn(message);
    }
    else
    {
      throw new IllegalStateException(message + ". Set both env vars on this deployment before starting KBS.");
    }
  }
}
