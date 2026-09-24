package uk.co.uworx.khoji.agile.controller.business;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import uk.co.uworx.khoji.agile.internal.helper.SecurityAccessLevel;
import uk.co.uworx.khoji.agile.persistence.dto.MemberDTO;
import uk.co.uworx.khoji.agile.persistence.dto.TeamDTO;
import uk.co.uworx.khoji.agile.response.Team;
import uk.co.uworx.khoji.agile.service.business.TeamsService;
import uk.co.uworx.khoji.security.annotations.HasAccessToInstanceWithPrivilege;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/teams")
public class TeamsController
{
  @Autowired
  private TeamsService teamsService;

  @GetMapping
  @HasAccessToInstanceWithPrivilege
  public ResponseEntity<List<TeamDTO>> getAllTeams()
  {
    return new ResponseEntity<>(
            teamsService.getAllTeams(),
            HttpStatus.OK
    );
  }

  @PostMapping("/members")
  @HasAccessToInstanceWithPrivilege
  public ResponseEntity<Map<Long, List<MemberDTO>>> getMembersAgainstTeam(@RequestBody Team.Request request)
  {
    return new ResponseEntity<>(
            teamsService.getTeamsAgainstIds(request.getTeamIds()),
            HttpStatus.OK
    );
  }

  @PostMapping(value = "/delete")
  @HasAccessToInstanceWithPrivilege(
          privileges = {
                  SecurityAccessLevel.ADMIN
          }
  )
  public ResponseEntity<Map<String, String>> deleteTeamsByIds(@RequestBody Team.Request request)
  {
    try {
      teamsService.deleteTeamsByIds(request.getTeamIds());
      return new ResponseEntity<>(
              Map.of("message", "success"),
              HttpStatus.OK
      );
    }
    catch (Exception e)
    {
      return new ResponseEntity<>(
              Map.of("message", e.getCause().toString()),
              HttpStatus.EXPECTATION_FAILED
      );
    }
  }
}
