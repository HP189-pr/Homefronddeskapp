import { sequelize } from '../db.mjs';
import { User } from '../models/user.mjs';

(async ()=>{
  try{
    await sequelize.authenticate();
    const users = await User.findAll({ limit: 50 });
    console.log('USERS', users.map(u=>({ id: u.id, userid: u.userid, usertype: u.usertype }))); 
    process.exit(0);
  }catch(e){
    console.error('ERR', e);
    process.exit(1);
  }
})();
