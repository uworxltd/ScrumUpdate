#!/bin/sh

sh ./set-khoji-env.sh

echo "Running KBS"

mvn spring-boot:run -Dspring-boot.run.arguments="--khoji.dataSource=Jira --worklog.tenant=jira --worklog.day.hour=8"