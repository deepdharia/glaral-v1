// Retire the previous Glaral offline shell after moving to the product studio.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  for(const name of await caches.keys())if(name.startsWith('glaral-'))await caches.delete(name);
  await self.clients.claim();
  await self.registration.unregister();
})()));
