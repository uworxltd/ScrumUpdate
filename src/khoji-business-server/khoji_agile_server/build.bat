@echo off
mvn clean install -DskipTests && mvn surefire:test -Dspring.profiles.active="test"
rem run a single test like this:
rem mvn test -Dtest="uk.co.uworx.khoji.agile.handler.ReleaseStatisticsHandlerTest" -Dspring.profiles.active="test"