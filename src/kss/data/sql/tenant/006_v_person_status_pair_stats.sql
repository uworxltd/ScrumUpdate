-- =============================================================================
-- View for calculating individual stats for person
-- =============================================================================
-- Template variables: {schema_name}

CREATE OR REPLACE VIEW {schema_name}.v_person_status_pair_stats AS
SELECT
  x.sprint_id,
  x.person,
  x.from_status,
  x.to_status,
  COUNT(*)                                                   AS transitions,
  AVG(x.duration_secs)::numeric                              AS avg_secs,
  PERCENTILE_DISC(0.5) WITHIN GROUP (ORDER BY x.duration_secs)::numeric AS p50_secs,
  PERCENTILE_DISC(0.9) WITHIN GROUP (ORDER BY x.duration_secs)::numeric AS p90_secs
FROM {schema_name}.v_issue_status_transitions x
WHERE x.person IS NOT NULL
GROUP BY x.sprint_id, x.person, x.from_status, x.to_status;

COMMENT ON VIEW {schema_name}.v_person_status_pair_stats IS
'
Per sprint, per person, per status-pair {from→to} stats:
count, avg_secs, p50_secs, p90_secs for time spent before transitioning.
Use for bottleneck analysis (e.g., In Progress→Code Review).
';