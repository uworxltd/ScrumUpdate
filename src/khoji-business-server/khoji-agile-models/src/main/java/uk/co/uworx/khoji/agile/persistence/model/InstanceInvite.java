package uk.co.uworx.khoji.agile.persistence.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

@Entity
@Table(name = "instance_invite")
@Getter
@Setter
@ToString
@NoArgsConstructor
@AllArgsConstructor
public class InstanceInvite
{
  @Id
  @GeneratedValue(strategy = GenerationType.SEQUENCE)
  long id;
  String email;
  String code;
  @ManyToOne
  @JoinColumn(name = "instance_user_id")
  InstanceUser instanceUser;

  public InstanceInvite(String email, String code, InstanceUser instanceUser)
  {
    this.email = email;
    this.code = code;
    this.instanceUser = instanceUser;
  }
}
