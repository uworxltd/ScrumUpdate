package uk.co.uworx.khoji.agile.request;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;
import java.util.List;
import java.util.Map;

@AllArgsConstructor
@Getter
@Setter
public class UserWorklogSummaryResponse
{
  private double worklogPercentage;
  private double totalAvailableSeconds;
  private double totalLoggedTimeInSeconds;
  private List<UserWorklogSummaryLoggedTimeInDays> loggedTimePerDay;
  private double workLogHoursPerDayConfig;
  private Map<String, Double> thresholdPercentage;
  private Map<String, String> thresholdColors;
}
