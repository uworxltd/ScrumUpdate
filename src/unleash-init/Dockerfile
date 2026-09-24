# One-shot Unleash init/sync job (KFX-931).
# A short-lived container that creates/enforces feature flags and context fields
# on the self-hosted Unleash instance. Run via docker compose (unleash-init).
FROM alpine:3.20

RUN apk add --no-cache curl jq

COPY sync.sh /sync.sh
RUN chmod +x /sync.sh

ENTRYPOINT ["/bin/sh", "/sync.sh"]
