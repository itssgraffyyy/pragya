import type { Plugin } from 'vite';
import { createHash } from 'node:crypto';
/** Normalize cache lookup for same-origin static assets whose preview server varies on Origin. Cache the production shell and local assets only; no backend or remote data cache. */
export function offlineShell():Plugin{return {name:'pragya-offline-shell',apply:'build',generateBundle(_options,bundle){
  const assets=['./','index.html',...Object.keys(bundle).filter((name)=>!name.endsWith('.map')&&name!=='index.html')];
  const version=createHash('sha256').update('shell-v2|'+assets.join('|')).digest('hex').slice(0,12);
  this.emitFile({type:'asset',fileName:'sw.js',source:`const CACHE='pragya-shell-${version}';const ASSETS=${JSON.stringify(assets)};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS.map(path=>new Request(new URL(path,self.registration.scope),{cache:'reload'})))).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('pragya-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;event.respondWith(caches.open(CACHE).then(async cache=>{const cached=await cache.match(event.request,{ignoreSearch:true,ignoreVary:true});if(cached)return cached;try{return await fetch(event.request);}catch(error){if(event.request.mode==='navigate')return (await cache.match(new URL('index.html',self.registration.scope)))||Response.error();throw error;}}));});`});
}};}
