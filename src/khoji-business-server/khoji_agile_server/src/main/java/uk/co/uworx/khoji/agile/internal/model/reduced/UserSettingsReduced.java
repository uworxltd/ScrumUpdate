package uk.co.uworx.khoji.agile.internal.model.reduced;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import uk.co.uworx.khoji.agile.internal.model.EmailFrequency;
import uk.co.uworx.khoji.agile.persistence.model.AccessLevel;

import java.io.Serializable;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class UserSettingsReduced implements Serializable
{
  private Long id;
  private boolean emailWorkLog;
  private EmailFrequency emailFrequency;
  private UserReduced user;
  private AccessLevel accessLevel;
}
