package uk.co.uworx.khoji.agile.internal.model.reduced;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import uk.co.uworx.khoji.agile.internal.model.TeamBoard;

import java.io.Serializable;
import java.util.HashSet;
import java.util.Set;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class TeamsReduced implements Serializable
{
  private Long id;

  private String teamName;

  private Set<MemberReduced> member = new HashSet<>();

  private Set<MemberReduced> supervisorsMembers;

  private Set<TeamBoard> boards = new HashSet<>();
}
