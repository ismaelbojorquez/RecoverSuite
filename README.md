## HTTPS setup

- TLS certs live in `certs/localhost.crt` and `certs/localhost.key`. Replace them with your own PEM files if you have real certificates.
- When you start the stack with `docker compose up`, nginx generates a 1-year self-signed `localhost` certificate automatically if the files are missing.
- Nginx terminates TLS on port `443` and redirects all HTTP traffic on port `80` to HTTPS.
- Backend is configured to trust the proxy so `X-Forwarded-*` headers and secure requests are honored.

## Run locally

```sh
docker compose up --build
```
