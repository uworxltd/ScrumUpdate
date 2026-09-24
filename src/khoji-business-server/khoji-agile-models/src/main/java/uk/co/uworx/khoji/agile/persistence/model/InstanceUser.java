package uk.co.uworx.khoji.agile.persistence.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.time.Instant;

@Entity
@Table(name = "instance_user")
@Getter
@Setter
@ToString
@NoArgsConstructor
@AllArgsConstructor
public class InstanceUser
{
  @Id
  @GeneratedValue(strategy = GenerationType.SEQUENCE)
  private long id;
  private String fullName;
  private String accountId;
  private String timeZone;
  private String email;
  @OneToOne
  @JoinColumn(name = "role_id")
  private Roles role;
  @OneToOne
  @JoinColumn(name = "access_level_id")
  private AccessLevel accessLevel;
  @OneToOne
  @JoinColumn(name = "user_settings_id")
  private UserSettings userSettings;
  private String status;
  @ManyToOne
  @JoinColumn(name = "instance_id")
  private Instance instance;
  private String avatarUrl;
  private Instant lastSeen;

  public InstanceUser(
          String fullName,
          String accountId,
          Instance instance,
          Roles role,
          KhojiUserStatus status,
          String email,
          String avatarUrl,
          AccessLevel accessLevel,
          UserSettings userSettings,
          String timeZone,
          Instant lastSeen
  )
  {
    this.fullName = fullName;
    this.accountId = accountId;
    this.instance = instance;
    this.role = role;
    this.status = status.name();
    this.email = email;
    this.avatarUrl = avatarUrl;
    this.accessLevel = accessLevel;
    this.userSettings = userSettings;
    this.timeZone = timeZone;
    this.lastSeen = lastSeen;
  }
}
