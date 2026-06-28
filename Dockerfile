# Stage 1: Build the React SPA frontend
FROM node:24-alpine AS ui-builder
WORKDIR /ui
COPY ui/package.json ui/package-lock.json ./
RUN npm ci
COPY ui/ .
# postbuild copies to ../cmd/llm-interceptor/ui/dist/ which is dev-only;
# Docker handles this via COPY --from=ui-builder in the go-builder stage.
RUN npm pkg delete scripts.postbuild && npm run build

# Stage 2: Build the Go binary
FROM golang:1.26-alpine AS go-builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
COPY --from=ui-builder /ui/dist ./cmd/llm-interceptor/ui/dist
RUN CGO_ENABLED=0 go build -o /app/llm-interceptor ./cmd/llm-interceptor

# Stage 3: Minimal runtime image
FROM alpine:3.21
RUN apk add --no-cache ca-certificates tzdata
WORKDIR /app
COPY --from=go-builder /app/llm-interceptor .
EXPOSE 8080
ENTRYPOINT ["/app/llm-interceptor"]
CMD ["config.yaml"]
