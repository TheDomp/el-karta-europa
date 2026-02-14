#!/bin/bash
# demo_movie.sh - Kör demo "filmen"

MODE=$1

if [ "$MODE" == "success" ]; then
    echo "🟢 Startar 'Success Mode' (All Green)..."
    TEST_FILE="tests/demo_movie_success.spec.ts"
elif [ "$MODE" == "fail" ]; then
    echo "🔴 Startar 'Failure Mode' (Bug Catching)..."
    TEST_FILE="tests/demo_movie_fail.spec.ts"
else
    echo "⚠️  Användning: ./scripts/demo_movie.sh [success|fail]"
    echo "   success -> Visar att allt fungerar (Gröna bockar)"
    echo "   fail    -> Visar att Agenten hittar buggar (Röda kryss)"
    exit 1
fi

echo "🍿 Startar Playwright i Headed Mode..."
npx playwright test $TEST_FILE --headed --slow --project="Testmiljö (Local)"
