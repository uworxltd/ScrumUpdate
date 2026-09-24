package uk.co.uworx.khoji.agile.persistence.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
public class RolesDTO
{
  Long id;
  String code;
  String name;
  @JsonIgnore
  Instant created_at;
  @JsonIgnore
  Instant updated_at;
}
