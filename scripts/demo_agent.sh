#!/bin/bash
# demo_agent.sh - Kör "Self-Healing Agent" demo

echo "🤖 Startar Agentic AI: Self-Healing Demo..."
echo "👁️  Detta test visar hur Agenten upptäcker en bugg och fixar den själv!"

# Kör Playwright med --headed och --slow
npx playwright test tests/demo_self_healing.spec.ts --headed --project="Testmiljö (Local)"
