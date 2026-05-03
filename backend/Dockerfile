FROM golang:1.23-alpine AS builder

WORKDIR /src

# Set GOTOOLCHAIN=auto globally to allow automatic toolchain downloads
ENV GOTOOLCHAIN=auto

# Download dependencies first for better Docker layer caching.
COPY go.mod go.sum ./
RUN go mod download

# Now copy source and build a fully static binary so the runtime image
# can be FROM scratch (no shell, no libc, smallest attack surface).
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build \
    -trimpath \
    -ldflags="-s -w" \
    -o /out/server ./cmd/api

FROM gcr.io/distroless/static-debian12:nonroot

WORKDIR /app
COPY --from=builder /out/server /app/server

# Render/Heroku/Fly map their public port to whatever $PORT we read in
# main.go. EXPOSE is purely documentation; no port binding happens here.
EXPOSE 8080

USER nonroot:nonroot
ENTRYPOINT ["/app/server"]