#!/bin/bash

echo "=================================================="
echo "      🤖 El-Karta Europa 2026 AI Demo 🤖      "
echo "=================================================="
echo ""

# Step 1: Gen AI - Generate Future Data
echo "🔹 [PHASE 1] Gen AI: Generating 'Winter 2026' Scenario..."
echo "   Prompt: 'Simulate extreme winter, low wind, nuclear outage in SE3'"

npx tsx scripts/generate_scenario.ts

if [ $? -eq 0 ]; then
    echo "✅ Scenario Data Generated: scenarios/winter_2026.json"
else
    echo "❌ Gen AI Step Failed. Check API Key."
    exit 1
fi

echo ""
echo "--------------------------------------------------"
echo ""

# Step 2: Agentic AI - Run Test
echo "🔹 [PHASE 2] Agentic AI: Verifying App Behavior..."
echo "   Agent Goal: 'Ensure high prices (>300 EUR/MWh) trigger alerts'"

# Run ONLY the agent scenario test, in headed mode so the user sees it
npx playwright test tests/agent_scenario.spec.ts --project='Prodmiljö (Live)' --headed

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ AGENT SUCCESS: All verification steps passed!"
    echo "   The Agent confirmed that the app handles the 'Winter 2026' scenario correctly."
else
    echo ""
    echo "❌ AGENT FAILURE: The app did not behave as expected."
fi

echo ""
echo "=================================================="
