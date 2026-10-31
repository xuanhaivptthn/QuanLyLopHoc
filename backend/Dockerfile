# ============================================================
# Stage 1: Builder
# ============================================================
FROM eclipse-temurin:21-jdk-alpine AS builder

WORKDIR /build

# Copy maven wrapper and pom.xml first to optimize layer caching
COPY mvnw pom.xml ./
COPY .mvn .mvn

# Download dependencies
RUN ./mvnw dependency:go-offline -B

# Copy application source code and compile
COPY src src
RUN ./mvnw clean package -DskipTests -B

# ============================================================
# Stage 2: Runtime (Minimal JRE & Non-root user)
# ============================================================
FROM eclipse-temurin:21-jre-alpine AS runtime

# Install curl for container healthcheck
RUN apk add --no-cache curl tzdata && \
    addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

WORKDIR /app

# Copy application jar from builder stage
COPY --from=builder --chown=appuser:appgroup /build/target/attendance-backend-*.jar app.jar

USER appuser

ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -Djava.security.egd=file:/dev/./urandom"
ENV SPRING_PROFILES_ACTIVE=prod

EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:8080/api/actuator/health || exit 1

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
