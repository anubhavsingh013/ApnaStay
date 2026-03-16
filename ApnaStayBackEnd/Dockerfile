# Stage 1: Build application
FROM maven:3.8.4-eclipse-temurin-17 AS build

WORKDIR /app

COPY pom.xml .
RUN mvn dependency:go-offline

COPY src ./src
RUN mvn clean package -DskipTests

# Stage 2: Run application
FROM eclipse-temurin:17-jdk-alpine

WORKDIR /app

COPY --from=build /app/target/apnastaybackend-0.0.1-SNAPSHOT.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]