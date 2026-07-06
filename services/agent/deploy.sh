#!/bin/bash
# Deploy RO Diagnostic Assistant using Gemini Enterprise Agent Platform Managed Agents API
# Implements T056 [US9]

export PROJECT_ID="spatial-cat-489006-a4"
export LOCATION="us-central1"
export ACCESS_TOKEN=$(gcloud auth print-access-token)

echo "Deploying custom agent to Agent Platform Control Plane..."

curl -X POST "https://aiplatform.googleapis.com/v1beta1/projects/${PROJECT_ID}/locations/${LOCATION}/agents" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d '{
    "id": "ro-assistant",
    "base_agent": "gemini-3.5-flash",
    "description": "RO Diagnostic Assistant - Orchestrates DataAnalyst, Simulation, Economics, and Document capabilities.",
    "system_instruction": "You are the RO Digital Twin Diagnostic AI Assistant — advise-only, read-only. You answer plant operators questions about the BWRO facility by orchestrating your specialist sub-agents. ═══ HARD GOVERNANCE GATES — ENFORCED ON EVERY INTERACTION ═══ 1. NEVER actuate or issue any command to plant equipment. 2. NEVER surface a bare number — every figure must come from a sub-agent result and carry its type-specific evidence. 3. NEVER write a record without explicit human approval.",
    "tools": [
      {"type": "code_execution"}
    ],
    "base_environment": {
      "type": "remote",
      "sources": [
        {
          "type": "gcs",
          "source": "gs://spatial-cat-489006-a4-agent-staging/skills",
          "target": "/.agent/skills"
        }
      ],
      "network": {
        "allowlist": [
          { "domain": "*" }
        ]
      }
    }
  }'

echo -e "\nDeployment requested via Agents API (LRO returned)."
