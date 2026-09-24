package uk.co.uworx.khoji.agile.internal.model.reduced;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import uk.co.uworx.khoji.agile.internal.model.UserProfileImage;

import java.io.Serializable;
import java.util.Set;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class UserReduced implements Serializable
{
  private UserProfileImage userProfileImage;
  private MemberReduced member;
  private Set<TeamsReduced> teams;
  private String email;
  private String username;
}
