(async () => {
  try {
    const res = await fetch('http://localhost:8000/api/sensor-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_tag: 'TEST-DEVICE-123', mac_address: 'TEST-MAC-123', temperature: 36.5, humidity: 55 })
    });
    const text = await res.text();
    console.log('STATUS', res.status);
    console.log(text);
  } catch (e) {
    console.error('ERR', e.message);
  }
})();
