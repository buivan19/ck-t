const axios = require('axios');
(async ()=>{
  try{
    const res = await axios.post('http://localhost:8000/api/sensor-data', { mac_address: 'TEST-MAC-123', temperature: 36.5, humidity: 55 }, { timeout: 5000 });
    console.log('STATUS', res.status);
    console.log(res.data);
  }catch(e){
    console.error('ERR', e && e.message ? e.message : e);
    if (e && e.response) console.error('RESP', e.response.status, e.response.data);
    if (e && e.stack) console.error(e.stack);
  }
})();
