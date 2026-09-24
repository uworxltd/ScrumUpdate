package uk.co.uworx.khoji.agile.response;

import uk.co.uworx.khoji.agile.persistence.model.KhojiUser;
import uk.co.uworx.khoji.agile.persistence.model.UserSettings;

public class UserProfileResponse extends KhojiUser
{
  public boolean worklogEmailEnabled;
  public String worklogEmailFrequency;

  public UserProfileResponse(KhojiUser khojiUser, UserSettings userSettings) {
    setId(khojiUser.getId());
    setUpdatedAt(khojiUser.getUpdatedAt());
    setCreatedAt(khojiUser.getCreatedAt());
    setFullName(khojiUser.getFullName());
    setEmail(khojiUser.getEmail());
    setFullName(khojiUser.getFullName());
    setImageUrl(khojiUser.getImageUrl());
    worklogEmailFrequency = userSettings.getWorklogEmailFrequency();
    worklogEmailEnabled = userSettings.isWorklogEmailEnabled();
  }
}
