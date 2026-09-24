package uk.co.uworx.khoji.agile.service.business;

import jakarta.annotation.PostConstruct;
import lombok.extern.log4j.Log4j2;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.core.LoggerContext;
import org.apache.logging.log4j.core.config.Configuration;
import org.apache.logging.log4j.core.config.LoggerConfig;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import uk.co.uworx.khoji.agile.internal.error.ServiceError;
import uk.co.uworx.khoji.agile.internal.error.ServiceException;
import uk.co.uworx.khoji.agile.persistence.model.Properties;
import uk.co.uworx.khoji.agile.persistence.service.PropertiesDataService;

import java.util.List;
import java.util.concurrent.ConcurrentHashMap;

@Service
@Log4j2
public class PropertiesService
{
  public static final String SOURCE_USER_CRON_EXPRESSION = "syncUsersWithSourceCronExpression";
  public static final String WORKLOG_EMAIL_CRON_EXPRESSION = "worklog.email.job.cronExpression";
  public static final String WORKLOG_SUMMARIES_GENERATION_CRON_EXPRESSION = "worklog.summaries.generation.job.cronExpression";

  @Autowired
  private PropertiesDataService propertiesDataService;

  private final ConcurrentHashMap<String, String> propertiesServiceConcurrentHashMap = new ConcurrentHashMap<>();

  @PostConstruct
  public void initializeHeaders()
  {
    List<Properties> propList = propertiesDataService.getAllProperties();
    propList.forEach(
            prop -> {
              propertiesServiceConcurrentHashMap.put(
                      prop.getKey(),
                      prop.getValue()
              );
            }
    );
  }


  public void resetToDefaultProperties()
  {
    try
    {
      propertiesDataService.deleteAllKeys();
      propertiesServiceConcurrentHashMap.clear();
    }
    catch (Exception exception)
    {
      throw new ServiceException(ServiceError.PD001);
    }
  }


  public void changeCronExpression(String key, String expression)
  {
    propertiesServiceConcurrentHashMap.put(
            key,
            propertiesDataService.saveProp(
                    key,
                    expression
            ).getValue()
    );
  }

  public void setLogLevel(String loggerName, String level)
  {
    LoggerContext context = (LoggerContext) LogManager.getContext(false);
    Configuration config = context.getConfiguration();

    LoggerConfig loggerConfig = config.getLoggerConfig(loggerName);

    if (loggerConfig != null)
    {
      loggerConfig.setLevel(org.apache.logging.log4j.Level.valueOf(level));
    }
    else
    {
      LoggerConfig newLoggerConfig = new LoggerConfig(loggerName, org.apache.logging.log4j.Level.valueOf(level), false);
      config.addLogger(loggerName, newLoggerConfig);
    }
    context.updateLoggers();
    System.out.println("Log level for logger '" + loggerName + "' updated to: " + level);
  }

  public String getValueAgainstKeyOrDefault(String key, String defaultValue)
  {
    return propertiesServiceConcurrentHashMap.getOrDefault(key, defaultValue);
  }
}
