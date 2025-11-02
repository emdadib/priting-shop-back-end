# Server Docker Deployment

This folder contains the Dockerfile for deploying the server application.

## Building the Docker Image

From the **root** of the project:

```bash
docker build -f server/Dockerfile/Dockerfile -t printing-shop-server:latest server/
```

Or from the **server** directory:

```bash
cd server
docker build -f Dockerfile/Dockerfile -t printing-shop-server:latest .
```

## Running the Container

### Basic Run

```bash
docker run -d \
  --name printing-shop-server \
  -p 3001:3001 \
  -e NODE_ENV=production \
  -e DATABASE_URL=postgresql://user:password@host:5432/dbname \
  -e JWT_SECRET=your-jwt-secret \
  printing-shop-server:latest
```

### With Docker Compose

```yaml
version: '3.8'

services:
  server:
    build:
      context: ./server
      dockerfile: Dockerfile/Dockerfile
    container_name: printing-shop-server
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/printing_shop
      - JWT_SECRET=${JWT_SECRET}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
    volumes:
      - ./server/uploads:/app/uploads
    depends_on:
      - postgres
    restart: unless-stopped
```

## Environment Variables

Required environment variables:

- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing secret
- `JWT_REFRESH_SECRET` - JWT refresh token secret (optional)
- `NODE_ENV` - Set to `production`

Optional environment variables:

- `PORT` - Server port (default: 3001)
- `CLIENT_URL` - Frontend URL for CORS
- `REDIS_URL` - Redis connection string
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` - Email configuration

## Volumes

- `/app/uploads` - File upload directory (mount as volume for persistence)

## Health Check

The container includes a health check that monitors the `/health` endpoint.

## Production Tips

1. **Use secrets management** for sensitive environment variables
2. **Mount volumes** for uploads directory to persist files
3. **Set resource limits** in Docker Compose or Kubernetes
4. **Enable logging** to stdout/stderr for log aggregation
5. **Run database migrations** before starting the server:

```bash
docker run --rm \
  -e DATABASE_URL=postgresql://... \
  printing-shop-server:latest \
  npx prisma migrate deploy
```

