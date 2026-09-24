CREATE OR REPLACE VIEW tenant_1005.v_sprint_calendar AS
SELECT s.sprint_id, s.name,
       g::date AS day,
       (g + interval '1 day' - interval '1 second') AS day_end
FROM tenant_1005.sprints s
CROSS JOIN LATERAL generate_series(
  date_trunc('day', COALESCE(s.start_date, now()))::date,
  date_trunc('day', COALESCE(s.complete_date, s.end_date, now()))::date,
  interval '1 day'
) AS g;