export async function GET() {
    // Mock GDACS pour tester
    return new Response(JSON.stringify([
      { id: '1', title: '🟢 Cyclone Tropical Océan Indien', country: 'Madagascar', severity: '🟢' },
      { id: '2', title: '🟡 Blizzard Watch NYC', country: 'USA', severity: '🟡' }
    ]), { headers: { 'Content-Type': 'application/json' } });
  }
  