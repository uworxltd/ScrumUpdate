@echo off
Title Khoji Business Server Cloud
:run
set JAR_FILE=NOTFound
for %%a in (.\target\*exec.jar) do (
if "%%a:~-12%" neq "-sources.jar" (
set JAR_FILE=%%a
)
)
if "%JAR_FILE%" == "NOTFound" (
echo Failed to locate jar file
goto end
)

java -Xdebug -Xmx4G -Xrunjdwp:transport=dt_socket,server=y,suspend=n,address=6666 ^
-Dbilling.subscription.prefix="waqas" ^
-jar %JAR_FILE%