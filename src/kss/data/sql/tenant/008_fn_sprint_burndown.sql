CREATE OR REPLACE FUNCTION {schema_name}.fn_sprint_burndown(p_sprint_id int)
RETURNS TABLE(sprint_id int, day date, scope_points numeric, done_points numeric, remaining_points numeric, added_points_day numeric, removed_points_day numeric)
LANGUAGE sql STABLE AS $func$
SELECT sprint_id, day, scope_points, done_points, remaining_points, added_points_day, removed_points_day
FROM {schema_name}.mv_sprint_burndown_daily
WHERE sprint_id = p_sprint_id
ORDER BY day;
$func$