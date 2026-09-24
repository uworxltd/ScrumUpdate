package uk.co.uworx.khoji.agile.persistence.service;

import lombok.extern.log4j.Log4j2;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.stereotype.Service;
import org.springframework.util.ObjectUtils;
import uk.co.uworx.khoji.agile.BootApplicationContextProviderAgileConfig;
import uk.co.uworx.khoji.agile.constants.InstanceConfigs;
import uk.co.uworx.khoji.agile.persistence.context.InstanceIdContext;
import uk.co.uworx.khoji.agile.persistence.model.Config;
import uk.co.uworx.khoji.agile.persistence.repository.ConfigRepository;

import java.util.List;

import static uk.co.uworx.khoji.agile.constants.InstanceConfigs.INCLUDE_WEEKENDS_IN_WORKLOG_STATS;

@Log4j2
@Service
public class ConfigDataService
{
  @Autowired
  private ConfigRepository configRepository;

  public Config saveOrUpdateConfig(Config config)
  {
    if (ObjectUtils.isEmpty(config.getInstanceId()))
    {
      config.setInstanceId(InstanceIdContext.getInstanceId());
    }
    return configRepository.save(config);
  }

  public void setDefaultConfigsForInstance(Long id)
  {
    log.debug("Adding default config for instance: {}", id);
    List<String> configKeys = InstanceConfigs.getAllConfigKeys();
    ApplicationContext applicationContext = BootApplicationContextProviderAgileConfig.getContext();
    for (String configKey : configKeys)
    {
      log.debug("Config: {}", configKey);
      Config systemConfig = new Config();
      String configValue = applicationContext.getEnvironment().getProperty(configKey);
      systemConfig.setPropKey(configKey);
      systemConfig.setPropValue(configValue);
      systemConfig.setInstanceId(id);
      saveOrUpdateConfig(systemConfig);
    }
  }

  public boolean isDataStorageAllowed(Long instanceId)
  {
    String config = this.getConfigByInstanceId(InstanceConfigs.DATA_STORAGE_PERMISSION, instanceId);
    return StringUtils.isNotEmpty(config) && Boolean.parseBoolean(config);
  }

  public String getConfigByInstanceId(String propKey, Long instanceId)
  {
    return configRepository.findConfigByInstanceId(instanceId, propKey);
  }

  public boolean IsWeekendStatsInclusionEnabled(Long instanceId)
  {
    String configValue = configRepository.findConfigByInstanceId(instanceId, INCLUDE_WEEKENDS_IN_WORKLOG_STATS);

    if (StringUtils.isNotEmpty(configValue))
    {
      return Boolean.parseBoolean(configValue);
    }
    return false;
  }
}
