package uk.co.uworx.khoji.agile.constants;

import java.util.Arrays;
import java.util.List;

public class InstanceConfigs
{
  public static final String WORKLOG_DISTRIBUTION_JSON = "worklogdistribution.json";
  public static final String WORKLOG_PERCENTAGE_THRESHOLD = "worklog.percentage.threshold";
  public static final String OTHER_WORKLOG_PERCENTAGE_THRESHOLD = "other.worklog.percentage.threshold";
  public static final String WORKLOG_DAY_HOUR = "worklog.day.hour";
  public static final String WORKLOG_MAIN_CATEGORIES_ALIAS = "worklog.main.categories.alias";
  public static final String WORKLOG_OTHER_CATEGORIES_ALIAS = "worklog.other.categories.alias";
  public static final String OTHERS_WORKLOG_EMAIL_SUBSCRIPTION_THRESHOLD = "others.worklog.email.subscription.threshold";
  public static final String DATA_STORAGE_PERMISSION = "worklog.data.storage.permission";
  public static final String WORKLOG_DATA_SYNC_PERMISSION = "worklog.data.sync.permission";
  public static final String SYNC_PAYLOAD = "sync.payload";
  public static final String SPRINT_ANALYTICS_TARGET_SPRINT = "sprint.analytics.target.sprint.id";
  public static final String INCLUDE_WEEKENDS_IN_WORKLOG_STATS = "include.weekends.in.worklog.stats";

  public static List<String> getAllConfigKeys() {
    return Arrays.asList(
            WORKLOG_DISTRIBUTION_JSON,
            WORKLOG_PERCENTAGE_THRESHOLD,
            OTHER_WORKLOG_PERCENTAGE_THRESHOLD,
            WORKLOG_DAY_HOUR,
            WORKLOG_OTHER_CATEGORIES_ALIAS,
            WORKLOG_MAIN_CATEGORIES_ALIAS,
            OTHERS_WORKLOG_EMAIL_SUBSCRIPTION_THRESHOLD,
            DATA_STORAGE_PERMISSION,
            WORKLOG_DATA_SYNC_PERMISSION,
            SYNC_PAYLOAD,
            SPRINT_ANALYTICS_TARGET_SPRINT,
            INCLUDE_WEEKENDS_IN_WORKLOG_STATS
    );
  }
}
