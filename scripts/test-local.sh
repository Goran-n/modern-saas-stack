#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting test database...${NC}"

# Start test database
docker-compose -f docker-compose.test.yml up -d

# Wait for database to be ready
echo "Waiting for database to be ready..."
for i in {1..30}; do
  if docker-compose -f docker-compose.test.yml exec -T postgres-test pg_isready -U test -d figgy_test &>/dev/null; then
    echo -e "${GREEN}Database is ready!${NC}"
    break
  fi
  echo -n "."
  sleep 1
done

# Set test database URL
export TEST_DATABASE_URL="postgresql://test:test@localhost:5433/figgy_test"

# Run migrations if needed
if [ -d "packages/shared-db" ]; then
  echo -e "${GREEN}Running migrations...${NC}"
  (cd packages/shared-db && bun run migrate)
fi

# Run tests
echo -e "${GREEN}Running tests...${NC}"
(cd packages/tenant && bun test "$@")
TEST_EXIT_CODE=$?

# Cleanup
if [ "$KEEP_DB" != "true" ]; then
  echo -e "${GREEN}Stopping test database...${NC}"
  docker-compose -f docker-compose.test.yml down -v
fi

exit $TEST_EXIT_CODE