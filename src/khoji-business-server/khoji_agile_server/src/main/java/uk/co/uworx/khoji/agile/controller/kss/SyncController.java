package uk.co.uworx.khoji.agile.controller.kss;

import lombok.extern.log4j.Log4j2;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import uk.co.uworx.khoji.agile.internal.model.Sync;
import uk.co.uworx.khoji.agile.service.business.instance.AnalyticsService;
import uk.co.uworx.khoji.agile.service.business.instance.SyncService;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/sync")
@Log4j2
public class SyncController
{
  private final SyncService syncService;
  private final AnalyticsService analyticsService;

  SyncController(
          SyncService syncService,
          AnalyticsService analyticsService
  )
  {
    this.syncService = syncService;
    this.analyticsService = analyticsService;
  }

  @GetMapping("/status")
  public ResponseEntity<Sync.StatusResponse> getSyncingStatus(@RequestParam String jobId, Principal principal)
  {
    Sync.StatusResponse status = syncService.getSyncStatus(jobId);
    return new ResponseEntity<>(status, HttpStatus.OK);
  }

  @GetMapping("/start")
  public ResponseEntity<Sync.Start.Response> triggerSync(Principal principal)
  {
    Sync.Start.Response response = syncService.startSync(principal.getName());
    return new ResponseEntity<>(response, HttpStatus.OK);
  }

  @PostMapping("/submit")
  public ResponseEntity<Sync.JobSubmissionResponse> submit(
          @RequestBody Sync.SyncParameters syncParameters,
          Principal principal
  )
  {
    return new ResponseEntity<>(syncService.submitSyncJob(syncParameters, principal.getName()), HttpStatus.ACCEPTED);
  }

  @GetMapping("/proactive/start")
  public ResponseEntity<Sync.Start.Response> triggerProActiveSprintsSync(Principal principal)
  {
    Sync.Start.Response response = syncService.startProActiveSync(principal.getName());
    return new ResponseEntity<>(response, HttpStatus.OK);
  }

  @GetMapping("/sprints")
  public ResponseEntity<Sync.JobSubmissionResponse> triggerSprintsListSync(Principal principal)
  {
    return new ResponseEntity<>(syncService.syncSprintsList(principal.getName()), HttpStatus.OK);
  }

  @GetMapping("/proactive/sprints")
  public ResponseEntity<List<Sync.SprintInfo>> getProactiveSprintsForTenant(Principal principal)
  {
    List<Sync.SprintInfo> sprints = this.analyticsService.fetchTenantSprints();
    return new ResponseEntity<>(sprints, HttpStatus.OK);
  }

  @PostMapping("/proactive/sprints/target")
  public ResponseEntity<String> setTargetSprintForSprintAnalytics(@RequestBody String sprintId, Principal principal)
  {
    return new ResponseEntity<>(this.analyticsService.setTargetSprintForSprintAnalytics(sprintId), HttpStatus.ACCEPTED);
  }
}
