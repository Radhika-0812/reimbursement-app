# ---------- Build stage ----------
FROM gradle:8.9-jdk21 AS build
WORKDIR /workspace

# Copy wrapper + build files from the backend subfolder
COPY be/reimbursement-app/gradlew ./
COPY be/reimbursement-app/gradlew.bat ./
COPY be/reimbursement-app/gradle ./gradle
COPY be/reimbursement-app/build.gradle ./

# Pre-fetch deps (cache)
RUN ./gradlew --no-daemon dependencies || true

# Copy the rest of the source
COPY be/reimbursement-app/ ./

# Build fat jar
RUN ./gradlew clean bootJar -x test --no-daemon

# ---------- Run stage ----------
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /workspace/build/libs/*.jar app.jar
ENV PORT=8080
EXPOSE 8080
CMD ["sh","-c","java -jar app.jar --server.port=${PORT}"]
