package uk.co.uworx.khoji.agile.internal.model;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import uk.co.uworx.khoji.agile.persistence.dto.TeamDTO;
import uk.co.uworx.khoji.agile.persistence.model.UserAccess;

import java.util.List;


@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
public class WorkLogModel
{
  private String name;
  private String email;
  private String userStatus;
  private boolean emailWorkLog = false;
  private EmailFrequency worklogEmailFrequency;
  private List<String> teams;
  private UserAccess userAccess;

  public WorkLogModel(UserAccess userAccess, List<String> teamNames)
  {
    this.name = userAccess.getInstanceUser().getFullName();
    this.email = userAccess.getInstanceUser().getEmail();
    this.emailWorkLog = userAccess.getInstanceUser().getUserSettings().isWorklogEmailEnabled();
    this.teams = teamNames;
    this.userStatus = userAccess.getInstanceUser().getStatus();
    this.userAccess = userAccess;
    this.worklogEmailFrequency = EmailFrequency.valueOf(
            userAccess
                    .getInstanceUser()
                    .getUserSettings()
                    .getWorklogEmailFrequency()
    );
  }
}
