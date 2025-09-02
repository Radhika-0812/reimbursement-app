# ── Stage 1: build ───────────────────────────────────────────────
FROM gradle:8.10-jdk21 AS build
WORKDIR /app
COPY . .
RUN gradle --no-daemon clean bootJar

# ── Stage 2: run ─────────────────────────────────────────────────
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/build/libs/*.jar app.jar
EXPOSE 8080
HEALTHCHECK --interval=20s --timeout=3s --retries=5 CMD wget -qO- http://localhost:8080/actuator/health | grep '"status":"UP"' || exit 1
ENTRYPOINT ["java","-jar","app.jar"]
