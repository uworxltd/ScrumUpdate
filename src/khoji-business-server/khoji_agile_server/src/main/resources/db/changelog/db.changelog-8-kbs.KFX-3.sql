--liquibase formatted sql

--changeset khoji.dev:8 --splitStatements:false labels:KFX-3
CREATE OR REPLACE FUNCTION khoji.fn_team_members_json(
    p_instance_id BIGINT,
    p_team_name   TEXT
) RETURNS JSONB
LANGUAGE sql
STABLE
AS $kfx$
WITH team_row AS (
  SELECT t.id, t.name, t.instance_id
  FROM khoji.teams t
  WHERE t.instance_id = p_instance_id
    AND t.name = trim(p_team_name)
  LIMIT 1
),
members AS (
  SELECT
      iu.id          AS user_id,
      iu.full_name,
      iu.account_id,
      iu.avatar_url,
      iu.role_id,
      r.code         AS role_code,
      r.name         AS role_name
  FROM team_row tr
  JOIN khoji.team_members tm
    ON tm.team_id = tr.id
  JOIN khoji.instance_user iu
    ON iu.id = tm.user_id
   AND iu.instance_id = tr.instance_id
  LEFT JOIN khoji.roles r
    ON r.id = iu.role_id
)
SELECT jsonb_build_object(
  'team', COALESCE((SELECT to_jsonb(tr) FROM team_row tr),
                   jsonb_build_object('id',NULL,'name',NULL,'instance_id',NULL)),
  'members', COALESCE(
      (SELECT jsonb_agg(
                  jsonb_build_object(
                    'user_id',    m.user_id,
                    'full_name',  m.full_name,
                    'account_id', m.account_id,
                    'avatar_url', m.avatar_url,
                    'role', jsonb_build_object(
                              'id',   m.role_id,
                              'code', m.role_code,
                              'name', m.role_name
                            )
                  )
                  ORDER BY m.full_name
              )
       FROM members m),
      '[]'::jsonb)
);
$kfx$;

--rollback DROP FUNCTION IF EXISTS khoji.fn_team_members_json(BIGINT, TEXT);
