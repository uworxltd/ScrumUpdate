package uk.co.uworx.khoji.agile.controller.business.instance;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.fasterxml.jackson.databind.ObjectMapper;

import uk.co.uworx.khoji.agile.handler.IssueSearchHandler;
import uk.co.uworx.khoji.agile.response.AccessibleResources;
import uk.co.uworx.khoji.agile.response.IssueDTO;
import uk.co.uworx.khoji.agile.service.TenantService;
import uk.co.uworx.khoji.agile.service.business.instance.JiraService;

import java.security.Principal;
import java.util.List;

@RestController
public class JiraController
{
  @Autowired
  private JiraService jiraService;
  @Autowired
  private IssueSearchHandler issueSearchHandler;
  @Autowired
  private TenantService tenantService;
  @Autowired
  private ObjectMapper objectMapper;

  @GetMapping("/accessible-resources")
  public ResponseEntity<AccessibleResources> getAccessibleResources(Principal principal)
  {
    return new ResponseEntity<>(
            jiraService.getAccessibleResources(principal),
            HttpStatus.OK
    );
  }

  @GetMapping("/issue/search")
  public ResponseEntity<List<IssueDTO>> searchJiraIssueWithQuery(@RequestParam String query, Principal principal)
  {
    return new ResponseEntity<>(
            issueSearchHandler.getSearchedIssuesWithQuery(query, principal),
            HttpStatus.OK
    );
  }

  @GetMapping("/issue/detail")
  public ResponseEntity<IssueDTO> getIssueDetail(@RequestParam String query, Principal principal)
  {
    var jiraClient = tenantService.getDataClient();
    var issueDetail = jiraClient.getIssueDetail(query, principal);
    return ResponseEntity.ok(objectMapper.convertValue(issueDetail, IssueDTO.class));
  }
}
