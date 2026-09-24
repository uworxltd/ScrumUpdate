FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /src
COPY . .
RUN mvn package -DskipTests -Dmaven.deploy.skip=true

FROM eclipse-temurin:21-jre-alpine
WORKDIR /home/app
COPY --from=build /src/khoji_agile_server/target/*-exec.jar khoji_agile_server.jar
COPY khoji_agile_server/docker-entrypoint.sh .
RUN chmod +x docker-entrypoint.sh
# Self-report health to Docker: /actuator/health is anonymous and whitelisted
# (JwtTokenService). Returns 503 when the DB is unreachable, i.e. unhealthy.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD ["wget", "-q", "-O", "/dev/null", "http://localhost:4243/actuator/health"]
ENTRYPOINT ["./docker-entrypoint.sh"]
