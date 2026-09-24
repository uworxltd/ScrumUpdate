package uk.co.uworx.khoji.agile.internal.model;

import lombok.Data;

import java.util.List;

@Data
public class HealthCheckConfig
{
  private boolean pushEnabled;
  private int pushFrequencyInSeconds;
  private String vmSubDomain;
  private String pluginBaseUrl;
  private String monitorPushUrl;
  private List<String> healthCheckExclusions;
}
