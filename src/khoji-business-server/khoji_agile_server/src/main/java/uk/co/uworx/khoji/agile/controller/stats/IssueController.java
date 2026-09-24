package uk.co.uworx.khoji.agile.controller.stats;

import io.swagger.v3.oas.annotations.Operation;
import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import uk.co.uworx.khoji.agile.handler.WorkLogHandler;
import uk.co.uworx.khoji.agile.response.IssueVerificationResponse;
import uk.co.uworx.khoji.agile.service.business.IssueService;
import uk.co.uworx.khoji.security.annotations.HasAccessToInstanceWithPrivilege;

import java.security.Principal;

@CrossOrigin
@RestController
@RequestMapping("/issue")
@Log4j2
public class IssueController
{
  @Autowired
  private WorkLogHandler workLogHandler;
  @Autowired
  private IssueService issueService;

  @Operation(summary = "Verify Issue Existence on Source by ID")
  @GetMapping(
          value = "/verify/{issueId}",
          produces = MediaType.APPLICATION_JSON_VALUE
  )
  @HasAccessToInstanceWithPrivilege
  public ResponseEntity<IssueVerificationResponse> verifyIssueExistence(@PathVariable String issueId, Principal principal) {

    return new ResponseEntity<>(issueService.doesIssueExistOnSource(issueId, principal), HttpStatus.OK);
  }

}
