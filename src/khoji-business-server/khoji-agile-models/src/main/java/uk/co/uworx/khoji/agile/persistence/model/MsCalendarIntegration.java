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
@Table(name = "ms_calendar")
@Getter
@Setter
@ToString
@NoArgsConstructor
@AllArgsConstructor
public class MsCalendarIntegration
{
  @Id
  @GeneratedValue(strategy = GenerationType.SEQUENCE)
  private Long id;

  private String type;

  private String token;

  private String refreshToken;
}
