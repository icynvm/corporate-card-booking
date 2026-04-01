# Corporate Card Booking: Reverse Proxy Orchestration

This directory contains the production-grade **Nginx Reverse Proxy** configuration for the Corporate Card Booking System. It is designed to sit in front of the Next.js application, providing essential security, performance, and character encoding stability.

## Core Features

- **Character Encoding Stability**: Specifically configured with `charset utf-8` to prevent "mojibake" (corrupted Thai characters) during high-load proxying.
- **Security Hardening**: Implements `HSTS`, `X-Frame-Options`, and `X-Content-Type-Options` to protect against common web vulnerabilities.
- **Zero-Downtime Resilience**: Configured with automated health checks and restart policies via Docker Compose.
- **Asset Optimization**: Aggressive caching headers for Next.js static assets (`/_next/static`) to reduce server load and improve LCP (Largest Contentful Paint).

## Deployment Instructions

### 1. Prerequisite Checklist
- [ ] Docker and Docker Compose installed on the target environment.
- [ ] Port `80` (and `443` if SSL is added) open in the firewall.
- [ ] Environment variables configured in a `.env` file (see `.env.example` in root).

### 2. Launching the Stack
From this directory, run:
```bash
docker-compose up -d --build
```

### 3. Verification
Verify that the proxy is successfully routing traffic:
```bash
docker-compose ps
docker-compose logs -f proxy
```

## Security & Maintenance

### SSL/TLS Consideration
Current configuration handles **Port 80 (HTTP)**. In a production environment, it is highly recommended to:
1.  **Cloud Load Balancer**: Use an AWS ALB or Cloudfront to terminate SSL and forward traffic to Port 80.
2.  **Certbot/LetsEncrypt**: If deploying on a standalone VPS, modify the `nginx.conf` and `docker-compose.yml` to include volumes for certificates and listen on Port 443.

### Troubleshooting Mojibake
If you experience character encoding issues:
1.  Ensure the Next.js app itself returns `Content-Type: text/html; charset=utf-8`.
2.  Verify the `nginx.conf` includes the `charset utf-8;` directive (already included in this refactored version).
