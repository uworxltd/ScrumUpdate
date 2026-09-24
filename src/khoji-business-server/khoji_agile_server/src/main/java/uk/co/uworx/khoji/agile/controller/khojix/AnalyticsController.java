package uk.co.uworx.khoji.agile.controller.khojix;

import lombok.extern.log4j.Log4j2;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import uk.co.uworx.khoji.agile.service.business.instance.AnalyticsService;

@RestController
@RequestMapping("/analytics")
@Log4j2
public class AnalyticsController
{
  private final AnalyticsService analyticsService;

  AnalyticsController(AnalyticsService analyticsService)
  {
    this.analyticsService = analyticsService;
  }

  @GetMapping("/get-analytics-data")
  public ResponseEntity<?> getAnalyticsData(
          @RequestParam String teamId,
          @RequestParam(required = false) String analyticsType
  )
  {
    return analyticsService.getAnalyticsData(teamId, analyticsType);
  }
  
  @GetMapping("/sprint-static-summary")
  public ResponseEntity<?> getSprintStaticSummary(
          @RequestParam String sprintId
  )
  {
    return analyticsService.getSprintStaticSummary(sprintId);
  }

  @GetMapping("/sprint-status-changes")
  public ResponseEntity<?> getSprintStatusChanges(
          @RequestParam String sprintId
  )
  {
    return analyticsService.getSprintStatusChanges(sprintId);
  }

  @GetMapping("/sprint-signals")
  public ResponseEntity<?> getSprintSignals(
          @RequestParam String sprintId,
          @RequestParam(required = false, defaultValue = "jira-insights") String source
  )
  {
    return analyticsService.getSprintSignals(sprintId, source);
  }

  @GetMapping("/sprint-signals-jira")
  public ResponseEntity<?> getSprintSignalsJira(
          @RequestParam String sprintId
  )
  {
    return analyticsService.getSprintSignalsJira(sprintId);
  }

  @GetMapping("/sprint-signals-human")
  public ResponseEntity<?> getSprintSignalsHuman(
          @RequestParam String sprintId
  )
  {
    return analyticsService.getSprintSignalsHuman(sprintId);
  }

  @GetMapping("/ticket-insights")
  public ResponseEntity<?> getTicketInsights(
          @RequestParam String issueKey
  )
  {
    return analyticsService.getTicketInsights(issueKey);
  }

  @GetMapping("/sprint-team-pulse")
  public ResponseEntity<?> getSprintTeamPulse(
          @RequestParam String sprintId
  )
  {
    return analyticsService.getSprintTeamPulse(sprintId);
  }

  @GetMapping("/sprint-velocity-burndown")
  public ResponseEntity<?> getSprintVelocityBurndown(
          @RequestParam String sprintId
  )
  {
    return analyticsService.getSprintVelocityBurndown(sprintId);
  }

  @GetMapping("/epic-fetch")
  public ResponseEntity<?> getEpicFetch(
          @RequestParam String sprintId
  )
  {
    return analyticsService.getEpicFetch(sprintId);
  }

  @GetMapping("/epic-insights")
  public ResponseEntity<?> getEpicInsights(
          @RequestParam String epicKey,
          @RequestParam String sprintId
  )
  {
    return analyticsService.getEpicInsights(epicKey, sprintId);
  }
}