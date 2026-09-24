package uk.co.uworx.khoji.agile.config;

import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Getter
@Component
public class SyncConfigs
{
  @Value("${mini.kss.base.url:http://localhost:8000}")
  private String kssBaseUrl;
  @Value("${sync.jobs.endpoint:/api/jobs}")
  private String syncJobsEndpoint;
  @Value("${mini.kss.sync.start.endpoint:/api/jobs/submit}")
  private String syncStartEndPoint;
  @Value("${sync.status.endpoint:/api/jobs/%s/status}") // %s is the job id
  private String syncStatusEndPoint;
  @Value("${kss.tenant.status.endpoint:/api/tenants/status}")
  private String tenantStatusEndpoint;
  @Value("${kss.tenant.sprints.endpoint:/api/jobs/sprints/all}")
  private String tenantSprintsEndpoint;
  @Value("${kss.tenant.schema.delete.endpoint:/tenants/%s}")
  private String tenantSchemaDeleteEndpoint;
}
