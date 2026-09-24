package uk.co.uworx.khoji.agile.internal.model.reduced;

import lombok.Data;
import lombok.NoArgsConstructor;
import uk.co.uworx.khoji.agile.internal.model.Role;

import java.io.Serializable;

@Data
@NoArgsConstructor
public class MemberReduced implements Serializable
{

  private Long id;
  private String memberEmail;
  private String accountId;
  private Role role;
  private String firstName;
  private String lastName;
  private String middleName;
  private String fullName;

  public MemberReduced(Long id, String memberEmail, String accountId, Role role)
  {
    this.id = id;
    this.memberEmail = memberEmail;
    this.accountId = accountId;
    this.role = role;
  }

  public MemberReduced(Long id, String memberEmail, String accountId, Role role, String firstName, String lastName, String middleName, String fullName)
  {
    this.id = id;
    this.memberEmail = memberEmail;
    this.accountId = accountId;
    this.role = role;
    this.firstName = firstName;
    this.lastName = lastName;
    this.middleName = middleName;
    this.fullName = fullName;
  }
}
