package uk.co.uworx.khoji.agile.persistence.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import uk.co.uworx.khoji.agile.persistence.model.UserSettings;
import uk.co.uworx.khoji.agile.persistence.repository.UserSettingsRepository;

@Service
public class UserSettingsDataService
{
  @Autowired
  private UserSettingsRepository userSettingsRepository;

  public UserSettings saveOrUpdate(UserSettings userSettings)
  {
    return userSettingsRepository.save(userSettings);
  }
}
