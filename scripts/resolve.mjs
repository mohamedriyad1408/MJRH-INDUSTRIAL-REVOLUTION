
import dns from 'node:dns';
dns.resolve4('db.dngjfjrjddigqadlyain.supabase.co', (err, addresses) => {
  if (err) console.error(err);
  else console.log(addresses[0]);
});
