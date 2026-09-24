package uk.co.uworx.khoji.agile.internal.model.reduced;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import uk.co.uworx.khoji.agile.internal.model.UserSettings;

import java.io.Serializable;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class UserDashboardReduced implements Serializable
{
  private UserSettingsReduced userSettings;
  private String userProfileBase64String;
  private List<String> accessibleAccessLevels;
  private boolean isProjectSourceConfigured;
  private boolean inTrial;
  private String nextBillingDate;
  private String companyURL;
  private String tenantName;
  private boolean isSurveyFilled;
  private boolean workLogCategoryAdded;
  private boolean usersAdded;
}
