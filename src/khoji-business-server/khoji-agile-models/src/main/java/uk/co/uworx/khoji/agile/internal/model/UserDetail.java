package uk.co.uworx.khoji.agile.internal.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.NotNull;

@NoArgsConstructor
@AllArgsConstructor
@Data
public class UserDetail
{
  @NotNull
  String accountId;

  String email;

  String roleCode;

  String accessLevelCode;
}
