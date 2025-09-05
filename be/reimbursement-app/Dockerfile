# ---------- Build stage ----------
FROM gradle:8.9-jdk21 AS build
WORKDIR /workspace

# We're already in Root Directory = be/reimbursement-app
# so files are relative to THIS folder.

# Copy Gradle wrapper & build files first (cache deps)
COPY gradlew ./
COPY gradlew.bat ./
COPY gradle ./gradle
COPY build.gradle ./

# Pre-fetch dependencies (keeps later builds fast)
RUN ./gradlew --no-daemon dependencies || true

# Copy the rest of the source
COPY . .

# Build fat jar
RUN ./gradlew clean bootJar -x test --no-daemon

# ---------- Run stage ----------
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /workspace/build/libs/*.jar app.jar

ENV PORT=8080
EXPOSE 8080
CMD ["sh","-c","java -jar app.jar --server.port=${PORT}"]
