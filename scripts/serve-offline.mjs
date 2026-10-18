/** Dependency-free, loopback-only server for an already built PRAGYA distribution. */
import { createServer } from 'node:http';
import { readFile,stat,realpath } from 'node:fs/promises';
import { resolve,dirname,sep,extname } from 'node:path';
import { fileURLToPath } from 'node:url';
const distribution=resolve(dirname(fileURLToPath(import.meta.url)),'../dist');
const port=Number(process.env.PRAGYA_PORT??5173);
if(!Number.isInteger(port)||port<0||port>65535)throw new Error('PRAGYA_PORT must be an integer from 0 to 65535');
let root;
try{root=await realpath(distribution);await stat(resolve(root,'index.html'));}catch{console.error('Built application missing. Run npm run build once, then npm run offline.');process.exit(1);}
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.mjs':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.ico':'image/x-icon','.woff2':'font/woff2','.wasm':'application/wasm'};
const server=createServer(async(req,res)=>{
 if(!['GET','HEAD'].includes(req.method??'')){res.writeHead(405,{Allow:'GET, HEAD'});res.end('Method not allowed');return;}
 let pathname;try{pathname=decodeURIComponent(new URL(req.url??'/', 'http://localhost').pathname);}catch{res.writeHead(400);res.end('Invalid request');return;}
 if(pathname.includes('\0')||pathname.includes('\\')){res.writeHead(400);res.end('Invalid path');return;}
 let candidate=resolve(root,'.'+pathname);if(candidate!==root&&!candidate.startsWith(root+sep)){res.writeHead(403);res.end('Forbidden');return;}
 if(pathname==='/'||pathname.endsWith('/'))candidate=resolve(candidate,'index.html');
 try{candidate=await realpath(candidate);if(!candidate.startsWith(root+sep)){res.writeHead(403);res.end('Forbidden');return;}const info=await stat(candidate);if(!info.isFile())throw new Error('Not a file');const body=await readFile(candidate);const extension=extname(candidate);res.writeHead(200,{'Content-Type':mime[extension]??'application/octet-stream','Content-Length':body.length,'Cache-Control':extension==='.html'||pathname.endsWith('/sw.js')?'no-cache':'public, max-age=31536000, immutable','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:body);}catch{res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('Not found');}
});
server.on('error',error=>{console.error(`Offline server could not start: ${error.message}. Keep the same hostname and port to retain access to the same browser data.`);process.exitCode=1;});
server.listen(port,'localhost',()=>{const address=server.address();console.log(`PRAGYA offline: http://localhost:${typeof address==='object'&&address?address.port:port}`);console.log('Serving local built resources only. Training data stays in this browser profile/origin. Press Ctrl+C to stop.');});
