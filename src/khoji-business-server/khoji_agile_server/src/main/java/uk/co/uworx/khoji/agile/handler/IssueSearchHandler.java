package uk.co.uworx.khoji.agile.handler;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import uk.co.uworx.khoji.agile.response.IssueDTO;
import uk.co.uworx.khoji.agile.service.TenantService;

import java.security.Principal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Component
@Log4j2
public class IssueSearchHandler
{
  @Autowired
  private TenantService tenantService;
  @Autowired
  private ObjectMapper objectMapper;


  public List<IssueDTO> getSearchedIssuesWithQuery(String query, Principal principal)
  {
    var issues = tenantService.getDataClient().getIssuesWithSearchQuery(query, principal);

    var uniqueIssues = issues.stream()
            .collect(Collectors.toMap(
                    issueMap -> (String) issueMap.get("key"),
                    issueMap -> objectMapper.convertValue(issueMap, IssueDTO.class),
                    (existing, replacement) -> existing
            ))
            .values();

    return new ArrayList<>(uniqueIssues);
  }
}
