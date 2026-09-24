# tenant_1001.v_person_status_pair_stats

_view_ — Per sprint, per person, per status-pair {from→to} stats:
count, avg_secs, p50_secs, p90_secs for time spent before transitioning.
Use for bottleneck analysis (e.g., In Progress→Code Review).

## Columns
- `sprint_id` **integer**
- `person` **text**
- `from_status` **text**
- `to_status` **text**
- `transitions` **bigint**
- `avg_secs` **numeric**
- `p50_secs` **numeric**
- `p90_secs` **numeric**

## Definition
```sql
 SELECT sprint_id,
    person,
    from_status,
    to_status,
    count(*) AS transitions,
    avg(duration_secs) AS avg_secs,
    percentile_disc(0.5::double precision) WITHIN GROUP (ORDER BY duration_secs)::numeric AS p50_secs,
    percentile_disc(0.9::double precision) WITHIN GROUP (ORDER BY duration_secs)::numeric AS p90_secs
   FROM tenant_1001.v_issue_status_transitions x
  WHERE person IS NOT NULL
  GROUP BY sprint_id, person, from_status, to_status;
```