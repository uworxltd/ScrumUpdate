-- DROP PROCEDURE khoji.cleanup_running_sync_jobs(bool);

CREATE OR REPLACE PROCEDURE kss_system.cleanup_running_sync_jobs(IN dry_run boolean)
 LANGUAGE plpgsql
AS $procedure$
DECLARE
    s RECORD;
    cnt bigint;
BEGIN
    FOR s IN
        SELECT schema_name
        FROM kss_system.tenants
        ORDER BY created_at
    LOOP
        BEGIN
            IF dry_run THEN
                -- Count running jobs
                EXECUTE format(
                    'SELECT count(*) FROM %I.sync_jobs WHERE status IN (%L, %L)',
                    s.schema_name, 'running', 'pending'
                ) INTO cnt;


                -- Print dry-run message
                RAISE NOTICE '[DRY-RUN] %.sync_jobs → % rows would be deleted', s.schema_name, cnt;
            ELSE
                -- Delete running jobs
                EXECUTE format(
                    'DELETE FROM %I.sync_jobs WHERE status IN (%L, %L)',
                    s.schema_name, 'running', 'pending'
                );

                -- Get affected rows
                GET DIAGNOSTICS cnt = ROW_COUNT;

                -- Print delete message
                RAISE NOTICE '[DELETE] %.sync_jobs → % rows deleted', s.schema_name, cnt;
            END IF;

        EXCEPTION
            WHEN undefined_table THEN
                RAISE NOTICE '[SKIP] %.sync_jobs → table not found', s.schema_name;
            WHEN others THEN
                RAISE NOTICE '[ERROR] %.sync_jobs → %', s.schema_name, SQLERRM;
        END;
    END LOOP;
END $procedure$;

CALL kss_system.cleanup_running_sync_jobs(false)