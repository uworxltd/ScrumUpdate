package uk.co.uworx.khoji.agile.stats.provider.jira.helper;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.log4j.Log4j2;

import org.json.JSONObject;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;
import org.springframework.util.ObjectUtils;
import org.springframework.web.client.RestTemplate;
import uk.co.uworx.khoji.agile.config.JiraConfig;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Log4j2
@Service
public class JiraClientRestHelper
{
  private final RestTemplate restTemplate = new RestTemplate();
  private final JiraConfig jiraConfig;

  public JiraClientRestHelper(
          JiraConfig jiraConfig
  )
  {
    this.jiraConfig = jiraConfig;
  }

  /*
  * For now this function doesn't have its own method to identify url and headers
  * for now these things need to be sent from the caller
  * */
  public <T> List<T> searchIssueUsingPost(
          String jiraSourceUrl,
          String jql,
          List<String> fields,
          List<String> expand,
          HttpHeaders headers
  )
  {
    try
    {
      ObjectMapper objectMapper = new ObjectMapper();
      long totalStart = System.currentTimeMillis();
      int pageNumber = 0;
      long totalPayloadBytes = 0;
      PageResult pageResult = null;
      ResponseEntity<Map<String, Object>> response;
      List<T> allIssues = new ArrayList<>();
      do
      {
        pageNumber++;
        Map<String, Object> requestBody = new HashMap<>(
                Map.of(
                        "jql", jql.replace("\\\"", "'"),
                        "maxResults", jiraConfig.issuesMaxResult
                )
        );

        if (!CollectionUtils.isEmpty(fields)) requestBody.put("fields", fields);
        if (!CollectionUtils.isEmpty(expand)) requestBody.put("expand", String.join(",", expand));
        // if we need to page on data, then this would be a required header
        if (!ObjectUtils.isEmpty(pageResult)) requestBody.put("nextPageToken", pageResult.nextPageToken);

        long pageStart = System.currentTimeMillis();
        response = restTemplate.exchange(
                jiraSourceUrl,
                HttpMethod.POST,
                new HttpEntity<>(requestBody, headers),
                new ParameterizedTypeReference<>() {}
        );
        long pageEnd = System.currentTimeMillis();

        // check if we need the next page as well
        pageResult = new PageResult(response.getBody());

        List<T> pageIssues = (List<T>) response.getBody().get("issues");
        int pageIssueCount = pageIssues != null ? pageIssues.size() : 0;
        allIssues.addAll(pageIssues);

        // Measure payload size
        long pagePayloadBytes = 0;
        try {
          String responseJson = objectMapper.writeValueAsString(response.getBody());
          pagePayloadBytes = responseJson.getBytes().length;
          totalPayloadBytes += pagePayloadBytes;
        } catch (Exception e) {
          log.warn("[SCRUM-TIMER] Failed to measure payload size: {}", e.getMessage());
        }

        log.debug("[SCRUM-TIMER] Jira searchPost page={} issuesInPage={} totalSoFar={} took={}ms payloadSize={}KB totalPayload={}MB url={}",
                pageNumber, pageIssueCount, allIssues.size(), pageEnd - pageStart, 
                pagePayloadBytes / 1024, totalPayloadBytes / 1024.0 / 1024.0, jiraSourceUrl);

      } while (!ObjectUtils.isEmpty(pageResult) && pageResult.isNextPageAvailable());

      long totalEnd = System.currentTimeMillis();
      log.debug("[SCRUM-TIMER] Jira searchPost completed totalPages={} totalIssues={} totalTime={}ms totalPayload={}MB avgPerIssue={}KB",
              pageNumber, allIssues.size(), totalEnd - totalStart, 
              totalPayloadBytes / 1024.0 / 1024.0, 
              allIssues.size() > 0 ? (totalPayloadBytes / 1024 / allIssues.size()) : 0);

      return allIssues;
    }
    catch (Exception exception)
    {
      log.error("Exception occurred while firing JQL: {}", jql, exception);
      throw exception;
    }
  }

  public String convertAdfToHtml(String adf) {
    if (adf == null || adf.isBlank()) return "";

    try {
        JSONObject json = new JSONObject(adf);
        StringBuilder sb = new StringBuilder();
        processAdfNodeHtml(json, sb);
        return sb.toString();
    } catch (Exception e) {
        return adf; // fallback
    }
  }

  private void processAdfNodeHtml(JSONObject node, StringBuilder sb) {
    String type = node.optString("type");

    switch (type) {
        case "doc", "paragraph" -> {
            sb.append("<p>");
            if (node.has("content")) {
                for (var c : node.getJSONArray("content")) {
                    processAdfNodeHtml((JSONObject) c, sb);
                }
            }
            sb.append("</p>");
        }

        case "text" -> sb.append(node.optString("text", ""));

        case "bulletList" -> {
            sb.append("<ul>");
            for (var c : node.getJSONArray("content")) {
                processAdfNodeHtml((JSONObject) c, sb);
            }
            sb.append("</ul>");
        }

        case "listItem" -> {
            sb.append("<li>");
            if (node.has("content")) {
                for (var c : node.getJSONArray("content")) {
                    processAdfNodeHtml((JSONObject) c, sb);
                }
            }
            sb.append("</li>");
        }

        default -> {
            // ignore unsupported blocks
        }
    }
  }

  public String convertAdfToText(String adf) {
    if (adf == null || adf.isBlank()) return "";

    try {
        JSONObject json = new JSONObject(adf);
        StringBuilder sb = new StringBuilder();
        processAdfNodeText(json, sb);
        return sb.toString().trim();
    } catch (Exception e) {
        return adf; // fallback
    }
  }

  private void processAdfNodeText(JSONObject node, StringBuilder sb) {
    String type = node.optString("type");

    switch (type) {
        case "doc", "paragraph" -> {
            if (node.has("content")) {
                for (var c : node.getJSONArray("content")) {
                    processAdfNodeText((JSONObject) c, sb);
                }
            }
            sb.append("\n");
        }

        case "text" -> sb.append(node.optString("text", "")).append(" ");

        case "bulletList" -> {
            for (var c : node.getJSONArray("content")) {
                processAdfNodeText((JSONObject) c, sb);
            }
        }

        case "listItem" -> {
            sb.append("• ");
            if (node.has("content")) {
                for (var c : node.getJSONArray("content")) {
                    processAdfNodeText((JSONObject) c, sb);
                }
            }
            sb.append("\n");
        }

        default -> {
            // ignore
        }
    }
  }
}
