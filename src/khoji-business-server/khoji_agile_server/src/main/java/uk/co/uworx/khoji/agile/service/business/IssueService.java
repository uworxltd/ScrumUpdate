package uk.co.uworx.khoji.agile.service.business;

import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import uk.co.uworx.khoji.agile.response.IssueVerificationResponse;
import uk.co.uworx.khoji.agile.service.TenantService;

import java.security.Principal;

@Service
@Log4j2
public class IssueService
{
  @Autowired
  private TenantService tenantService;

  public IssueVerificationResponse doesIssueExistOnSource(String issueId, Principal principal) {
    boolean exists = tenantService.getDataClient().isValidJiraIssueId(issueId, principal).is2xxSuccessful();
    if (exists) {
      return new IssueVerificationResponse(issueId, true);
    }
    return new IssueVerificationResponse(issueId, false);
  }
}
