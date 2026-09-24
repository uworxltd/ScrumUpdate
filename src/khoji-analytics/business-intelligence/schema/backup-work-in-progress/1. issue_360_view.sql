CREATE OR REPLACE VIEW tenant_1005.v_issue_360 AS
SELECT
  i.issue_id,
  i.issue_key,
  i.summary,
  -- i.description,            -- intentionally omitted per request
  i.issue_type,
  i.status,
  i.status_category,
  i.status_category_change_date,
  i.priority,
  i.assignee_display_name,
  i.assignee_account_id,
  i.reporter_display_name,
  i.reporter_account_id,
  i.created_date,
  i.updated_date,
  i.resolution_date,
  i.story_points,
  i.time_spent,
  i.time_original_estimate,
  i.aggregate_time_spent,
  i.labels,
  i.components,
  i.parent_issue_key,          -- raw column, keep as-is for traceability
  i.last_synced_at,

  -- TRUE parent (data is swapped in table: parent_issue_key actually holds CHILD; child_issue_key holds PARENT)
  parent_rel.parent_ref,

  -- TRUE children/subtasks (data swapped, so child_issue_key actually holds PARENT; parent_issue_key holds CHILD)
  children_rel.subtasks,

  -- Sprint memberships (from sprint_issues)
  si_pack.sprints,

  -- Comments bundle
  cm_pack.comments,
  cm_pack.comment_count,

  -- Links
  lo_pack.links_outgoing,
  li_pack.links_incoming,

  -- Latest status change timestamp
  st_pack.latest_status_change

FROM tenant_1005.issues i

-- Parent (swap mapping)
LEFT JOIN LATERAL (
  SELECT jsonb_build_object(
           'issue_key', p.issue_key,
           'summary',   p.summary,
           'status',    p.status,
           'story_points', p.story_points
         ) AS parent_ref
  FROM tenant_1005.issue_relationships r
  JOIN tenant_1005.issues p
    ON p.issue_key = r.child_issue_key      -- child_issue_key actually stores PARENT
  WHERE r.parent_issue_key = i.issue_key    -- parent_issue_key actually stores CHILD (this issue)
  LIMIT 1
) parent_rel ON TRUE

-- Children/subtasks (swap mapping)
LEFT JOIN LATERAL (
  SELECT COALESCE(
           jsonb_agg(
             jsonb_build_object(
               'issue_key', c.issue_key,
               'summary',   c.summary,
               'status',    c.status,
               'story_points', c.story_points
             )
             ORDER BY c.created_date
           ),
           '[]'::jsonb
         ) AS subtasks
  FROM tenant_1005.issue_relationships r
  JOIN tenant_1005.issues c
    ON c.issue_key = r.parent_issue_key     -- parent_issue_key actually stores CHILD
  WHERE r.child_issue_key = i.issue_key     -- child_issue_key actually stores PARENT (this issue)
) children_rel ON TRUE

-- Sprint memberships
LEFT JOIN LATERAL (
  SELECT COALESCE(
           jsonb_agg(
             jsonb_build_object(
               'sprint_id', s.sprint_id,
               'name',      s.name,
               'state',     s.state,
               'start_date',s.start_date,
               'end_date',  s.end_date,
               'complete_date', s.complete_date
             )
             ORDER BY s.start_date NULLS LAST, s.sprint_id
           ),
           '[]'::jsonb
         ) AS sprints
  FROM tenant_1005.sprint_issues si
  JOIN tenant_1005.sprints s ON s.sprint_id = si.sprint_id
  WHERE si.issue_key = i.issue_key
) si_pack ON TRUE

-- Comments
LEFT JOIN LATERAL (
  SELECT
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'comment_id', c.comment_id,
          'author',     c.author_display_name,
          'created',    c.created_date,
          'updated',    c.updated_date,
          'body',       c.comment_body
        )
        ORDER BY c.created_date
      ),
      '[]'::jsonb
    ) AS comments,
    COUNT(c.comment_id)::int AS comment_count
  FROM tenant_1005.comments c
  WHERE c.issue_key = i.issue_key
) cm_pack ON TRUE

-- Links outgoing
LEFT JOIN LATERAL (
  SELECT COALESCE(
           jsonb_agg(
             jsonb_build_object(
               'link_type',       il.link_type,
               'to_issue_key',    il.linked_issue_key,
               'to_issue_status', j.status
             )
             ORDER BY il.link_type, il.linked_issue_key
           ),
           '[]'::jsonb
         ) AS links_outgoing
  FROM tenant_1005.issue_links il
  LEFT JOIN tenant_1005.issues j ON j.issue_key = il.linked_issue_key
  WHERE il.source_issue_key = i.issue_key
) lo_pack ON TRUE

-- Links incoming
LEFT JOIN LATERAL (
  SELECT COALESCE(
           jsonb_agg(
             jsonb_build_object(
               'link_type',        il.link_type,
               'from_issue_key',   il.source_issue_key,
               'from_issue_status',j.status
             )
             ORDER BY il.link_type, il.source_issue_key
           ),
           '[]'::jsonb
         ) AS links_incoming
  FROM tenant_1005.issue_links il
  LEFT JOIN tenant_1005.issues j ON j.issue_key = il.source_issue_key
  WHERE il.linked_issue_key = i.issue_key
) li_pack ON TRUE

-- Latest status change
LEFT JOIN LATERAL (
  SELECT MAX(cl.created_date) AS latest_status_change
  FROM tenant_1005.changelogs cl
  WHERE cl.issue_key = i.issue_key
    AND cl.field_name = 'status'
) st_pack ON TRUE
;
