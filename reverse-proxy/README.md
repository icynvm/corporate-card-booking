# Next.js Reverse Proxy Setup

This project demonstrates a production-ready reverse proxy configuration using Nginx and Docker Compose for your Corporate Card Booking System.

## Architecture

-   **Nginx Container**: Acts as the entry point (Port 80), handles SSL (TLS) termination, static file caching, and request forwarding.
-   **Next.js Application**: Running in a separate container (Port 3000) on an internal Docker network.

## Files

-   `nginx.conf`: Custom Nginx configuration with optimized headers and proxy set-ups.
-   `docker-compose.yml`: Orchestrates the application and proxy containers.

## How to Run

1.  **Prepare .env**: Ensure you have a `.env` file in the root directory (parent of this folder) containing your Supabase and Prisma environment variables.
2.  **Dockerfile**: Ensure you have a standard Next.js Dockerfile in the root directory. If you don't have one, I can create it for you.
3.  **Run with Docker Compose**:
    ```bash
    docker-compose up -d --build
    ```
4.  **Access**: Open `http://localhost` in your browser.

## Customization

-   **SSL**: To add HTTPS, you can use a sidecar container like `nginx-proxy-manager` or `certbot` to manage Let's Encrypt certificates.
-   **Domain**: Update the `server_name` in `nginx.conf` to your actual domain.
