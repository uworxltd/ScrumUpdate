package uk.co.uworx.khoji.agile.controller.dev;

import lombok.extern.log4j.Log4j2;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import uk.co.uworx.khoji.agile.service.jobs.WorkLogSummariesGenerationJob;

@RestController
@Profile("dev")
@RequestMapping("/jobs")
@Log4j2
public class JobTriggerAPI
{
  public final WorkLogSummariesGenerationJob workLogSummariesGenerationJob;

  public JobTriggerAPI(
          WorkLogSummariesGenerationJob workLogSummariesGenerationJob
  )
  {
    this.workLogSummariesGenerationJob = workLogSummariesGenerationJob;
  }

  @GetMapping("/generateWorkLogSummaries")
  public void triggerSummariesJob()
  {
    try
    {
      workLogSummariesGenerationJob.process(null);
    } catch (Exception e)
    {
      log.error("job execution failed with exception", e);
    }
  }
}
