# Docker-based SIP Server for E2E Testing

This directory contains Docker configuration for running a real Asterisk SIP server for integration testing.

## Quick Start

### Prerequisites

- Docker installed and running
- Docker Compose installed

### Start the SIP Server

```bash
cd tests/e2e/docker
docker-compose up -d
```

### Check Server Status

```bash
docker-compose ps
docker-compose logs -f asterisk
```

### Stop the Server

```bash
docker-compose down
```

## Configuration

### Test Users

The following test users are pre-configured:

| Username | Password | SIP URI |
|----------|----------|---------|
| userA | testpassA | sip:userA@localhost |
| userB | testpassB | sip:userB@localhost |
| userC | testpassC | sip:userC@localhost |

### Connection Settings

- **WebSocket URL:** `wss://localhost:8088/ws`
- **Protocol:** SIP over WebSocket (WSS)
- **Supported Codecs:** ULAW, ALAW, Opus
- **RTP Ports:** 10000-10100

## Running Integration Tests

Once the Docker container is running, you can run integration tests that connect to the real SIP server:

```bash
# Run integration tests
npm run test:e2e:integration

# Or run specific integration test file
npx playwright test tests/e2e/real-sip-integration.spec.ts
```

## Troubleshooting

### Container won't start

```bash
# Check logs
docker-compose logs asterisk

# Rebuild container
docker-compose down
docker-compose build --no-cache
docker-compose up
```

### Connection refused

1. Ensure Docker container is running: `docker-compose ps`
2. Check port bindings: `docker port asterisk-test`
3. Verify firewall allows connections to port 8088

### Audio/Video not working

1. Check RTP port range is accessible
2. Verify firewall allows UDP ports 10000-10100
3. Check Asterisk logs: `docker-compose logs -f asterisk`

## Configuration Files

- `Dockerfile.asterisk` - Asterisk container image
- `docker-compose.yml` - Docker Compose configuration
- `pjsip.conf` - PJSIP endpoint configuration
- `extensions.conf` - Dialplan configuration
- `http.conf` - HTTP/WebSocket configuration
- `asterisk.conf` - General Asterisk configuration

## Logs

Asterisk logs are stored in `./logs/` directory and persist across container restarts.

## Security Note

⚠️ **This configuration is for testing only!**

The test users have simple passwords and the server accepts unauthenticated connections. Do NOT use this configuration in production.

## Advanced Usage

### Custom Configuration

To modify Asterisk configuration:

1. Edit configuration files in this directory
2. Rebuild container: `docker-compose build`
3. Restart: `docker-compose up -d`

### Access Asterisk CLI

```bash
docker exec -it asterisk-test asterisk -r
```

Common CLI commands:
- `pjsip show endpoints` - Show all endpoints
- `pjsip show registrations` - Show active registrations
- `core show channels` - Show active calls
- `core set verbose 10` - Increase verbosity
- `exit` - Exit CLI

### Monitor SIP Messages

```bash
# Enable SIP debug
docker exec -it asterisk-test asterisk -rx "pjsip set logger on"

# View SIP messages in logs
docker-compose logs -f asterisk | grep SIP
```

## Integration with E2E Tests

The real SIP server integration tests are located in:
- `tests/e2e/real-sip-integration.spec.ts`

These tests:
- Connect to the real Asterisk server
- Perform actual SIP registration
- Make real calls between test users
- Test actual codec negotiation
- Validate real RTP media streams

This provides higher confidence than mocked tests but runs slower.

## Performance

- Container startup time: ~3-5 seconds
- First registration: ~200-500ms
- Call setup time: ~500-1000ms

## Cleanup

Remove container and all data:

```bash
docker-compose down -v
rm -rf logs/
```

## Resources

- [Asterisk Documentation](https://wiki.asterisk.org)
- [PJSIP Configuration](https://wiki.asterisk.org/wiki/display/AST/Configuring+res_pjsip)
- [WebRTC Support](https://wiki.asterisk.org/wiki/display/AST/WebRTC)
