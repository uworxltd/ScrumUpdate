package uk.co.uworx.khoji.agile.persistence.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
public class TeamDTO
{
  Long id;
  String teamName;
  List<MemberDTO> members;
  List<MemberDTO> supervisors;
}
