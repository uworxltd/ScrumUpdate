package uk.co.uworx.khoji.agile.stats.provider.jira.helper;

import lombok.Getter;
import lombok.Setter;
import org.springframework.util.StringUtils;

import java.util.Map;

@Getter
@Setter
public class PageResult {
  public boolean nextPageAvailable;
  public String nextPageToken;

  public PageResult(Object response) {
    if (response != null) {
      Map<?, ?> map = (Map<?, ?>) response;
      boolean isLastPage = (boolean) map.get("isLast");
      this.nextPageToken = (String) map.get("nextPageToken");
      this.nextPageAvailable = !isLastPage && StringUtils.hasLength(this.nextPageToken);
    }
    else
    {
      this.nextPageToken = null;
      this.nextPageAvailable = false;
    }
  }
}