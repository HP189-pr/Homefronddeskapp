const http = require('http');

function req(path, method='GET', body=null, token=null){
  return new Promise((resolve,reject)=>{
    const opts = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    if(token) opts.headers['Authorization'] = 'Bearer ' + token;
    const r = http.request(opts, (res)=>{
      let data='';
      res.on('data', c=> data+=c);
      res.on('end', ()=>{
        try{ const json = JSON.parse(data); resolve(json); }catch(err){ resolve(data); }
      });
    });
    r.on('error', reject);
    if(body) r.write(body);
    r.end();
  });
}

(async()=>{
  try{
    console.log('Attempting login...');
    const login = await req('/api/auth/login','POST', JSON.stringify({userid:'admin', password:'Admin123'}));
    console.log('LOGIN ->', login);
    const token = login.token;
    if(!token){ console.error('No token from login'); return; }

    console.log('Creating user...');
    const username = 'testuser_' + Date.now();
    const create = await req('/api/admin/users','POST', JSON.stringify({userid: username, name: 'Test User', usertype: 'operator', usrpassword: 'pass123'}), token);
    console.log('CREATE ->', create);
    const uid = create.id || (create.user && create.user.id) || create.data?.id;
    if(!uid){ console.error('No user id in create response'); return; }

    console.log('Fetching logs for user id', uid);
    const logs = await req('/api/logs/users/' + uid, 'GET', null, token);
    console.log('LOGS ->', logs);
  }catch(e){
    console.error('ERROR', e);
  }
})();
