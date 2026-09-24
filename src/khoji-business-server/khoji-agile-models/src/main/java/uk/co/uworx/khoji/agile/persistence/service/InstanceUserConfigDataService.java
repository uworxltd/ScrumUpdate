/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.persistence.service;

import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import uk.co.uworx.khoji.agile.internal.error.ServiceError;
import uk.co.uworx.khoji.agile.internal.error.ServiceException;
import uk.co.uworx.khoji.agile.persistence.model.InstanceUser;
import uk.co.uworx.khoji.agile.persistence.model.InstanceUserConfig;
import uk.co.uworx.khoji.agile.persistence.repository.InstanceUserConfigRepository;

import java.util.HashMap;
import java.util.List;

@Log4j2
@Service
public class InstanceUserConfigDataService
{
  @Autowired
  private InstanceUserConfigRepository instanceUserConfigRepository;

  public List<InstanceUserConfig> getAllInstanceUserConfigs(InstanceUser instanceUser)
  {
    return instanceUserConfigRepository.findAllByInstanceUserId(instanceUser.getId());
  }

  public InstanceUserConfig findByKeyAndByInstanceUserId(String key, long instanceUserId)
  {
    return instanceUserConfigRepository.findByKeyAndByInstanceUserId(key, instanceUserId).orElse(null);
  }

  public void saveInstanceUserConfig(String key, String value, InstanceUser instanceUser)
  {
    try
    {
      InstanceUserConfig instanceUserConfig = findByKeyAndByInstanceUserId(key, instanceUser.getId());
      if (instanceUserConfig == null)
      {
        instanceUserConfigRepository.save(
                new InstanceUserConfig(
                        key,
                        value,
                        instanceUser
                )
        );
      }
      else
      {
        instanceUserConfig.setValue(value);
        instanceUserConfigRepository.save(instanceUserConfig);
      }
    }
    catch (Exception exception)
    {
      log.error("Failed to save/update instance user config: {}, {} :: {}", key, value, exception.toString());
      throw new ServiceException(ServiceError.IUC001);
    }
  }

  public HashMap<String, String> convertListToHashMap(List<InstanceUserConfig> configList)
  {
    HashMap<String, String> configMap = new HashMap<>();
    for (InstanceUserConfig config : configList)
    {
      configMap.put(config.getKey(), config.getValue());
    }
    return configMap;
  }
}
