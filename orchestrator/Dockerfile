FROM rust:1-alpine AS builder

WORKDIR /app
RUN apk add --no-cache musl-dev
COPY Cargo.toml Cargo.lock ./
COPY migrations ./migrations
COPY src ./src
RUN cargo build --release

FROM alpine:3.22

ENV HOME=/home/runhelm

LABEL org.opencontainers.image.source="https://github.com/markosski/runhelm" \
      org.opencontainers.image.description="RunHelm orchestrator" \
      org.opencontainers.image.licenses="MIT"

RUN apk add --no-cache ca-certificates \
    && addgroup -g 10001 runhelm \
    && adduser -D -h /home/runhelm -u 10001 -G runhelm runhelm \
    && mkdir -p /var/lib/runhelm /workspaces \
    && chown runhelm:runhelm /var/lib/runhelm /workspaces
COPY --from=builder /app/target/release/orchestrator /usr/local/bin/orchestrator
USER runhelm

EXPOSE 3000 3001
ENTRYPOINT ["/usr/local/bin/orchestrator"]
