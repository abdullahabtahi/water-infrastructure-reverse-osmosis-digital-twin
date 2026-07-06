#!/bin/bash
# Latency measurement check for semantic cache vs Agent Runtime
# Targets: < 5s P95 single-cap, < 15s P95 multi-cap, < 1s P95 cache hit

echo "Running latency check for semantic cache..."

echo "[Test 1/3] Cache Miss (Single Capability) - 'Why is Unit A1 energy climbing?'"
time curl -X POST -H "Content-Type: application/json" -d '{"input": "Why is Unit A1 energy climbing?"}' http://localhost:3000/api/agent/stream > /dev/null
# Expect ~3-5s

echo "\n[Test 2/3] Cache Hit - 'Why is Unit A1 energy climbing?'"
time curl -X POST -H "Content-Type: application/json" -d '{"input": "Why is Unit A1 energy climbing?"}' http://localhost:3000/api/agent/stream > /dev/null
# Expect < 1s

echo "\n[Test 3/3] Cache Miss (Multi Capability) - 'Should I clean Unit B2 now or wait?'"
time curl -X POST -H "Content-Type: application/json" -d '{"input": "Should I clean Unit B2 now or wait?"}' http://localhost:3000/api/agent/stream > /dev/null
# Expect ~8-15s

echo "\nTests completed. If P95 latency exceeds SLOs, verify BQ VECTOR_SEARCH execution times in Cloud Trace."
