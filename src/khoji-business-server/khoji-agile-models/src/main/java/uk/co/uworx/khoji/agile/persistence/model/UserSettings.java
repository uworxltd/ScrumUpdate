package uk.co.uworx.khoji.agile.persistence.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

@Entity
@Table(name = "user_settings")
@Getter
@Setter
@ToString
@NoArgsConstructor
@AllArgsConstructor
public class UserSettings
{
  @Id
  @GeneratedValue(strategy = GenerationType.SEQUENCE)
  long id;
  boolean worklogEmailEnabled;
  String worklogEmailFrequency;

  public UserSettings(boolean worklogEmailEnabled, String worklogEmailFrequency)
  {
    this.worklogEmailEnabled = worklogEmailEnabled;
    this.worklogEmailFrequency = worklogEmailFrequency;
  }
}
