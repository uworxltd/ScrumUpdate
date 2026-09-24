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
@Table(name = "properties")
@Getter
@Setter
@ToString
@NoArgsConstructor
@AllArgsConstructor
public class Properties
{
  @Id
  @GeneratedValue(strategy = GenerationType.SEQUENCE)
  private Long id;

  private String application;
  private String profile;
  private String label;
  private String key;
  private String value;

  public Properties(String profile, String label, String key, String value)
  {
    this.application = "khoji_agile_server";
    this.profile = profile;
    this.label = label;
    this.key = key;
    this.value = value;
  }
}
