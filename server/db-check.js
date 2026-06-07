async function testFetch() {
  try {
    console.log('Fetching from /api/expert/discover...');
    const res = await fetch('http://localhost:3000/api/expert/discover');
    console.log('Status:', res.status);
    const data = await res.json();
    console.log('Discover Result:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Fetch error:', error);
  }
}

testFetch();
