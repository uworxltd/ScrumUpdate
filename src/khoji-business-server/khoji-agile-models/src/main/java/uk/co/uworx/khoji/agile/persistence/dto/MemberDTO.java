package uk.co.uworx.khoji.agile.persistence.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
public class MemberDTO {
    Long id;
    String fullName;
    Boolean isInMultipleTeams;
    String memberEmail;
    String accountId;
    RolesDTO role;
    String accessLevelCode;
    String status;
  }