FROM gradle:8.9-jdk21 AS build
WORKDIR /workspace
COPY gradlew ./
COPY gradlew.bat ./
COPY gradle ./gradle
COPY build.gradle ./
RUN ./gradlew --no-daemon dependencies || return 0
COPY . .
RUN ./gradlew clean bootJar -x test --no-daemon

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /workspace/build/libs/*.jar app.jar
ENV PORT=8080
EXPOSE 8080
CMD ["sh","-c","java -jar app.jar --server.port=${PORT}"]
