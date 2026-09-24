package uk.co.uworx.khoji.agile.persistence.model;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.Objects;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class TeamMemberCompositeKey
{
  private long teamId;
  private long userId;

  @Override
  public boolean equals(Object o)
  {
    if (this == o) {return true;}
    if (!(o instanceof TeamMemberCompositeKey that)) {return false;}
    return teamId == that.teamId && userId == that.userId;
  }

  @Override
  public int hashCode()
  {
    return Objects.hash(teamId, userId);
  }
}
