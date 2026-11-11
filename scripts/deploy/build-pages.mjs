import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {execFileSync,spawnSync} from 'node:child_process';
const root=process.cwd();
const temp=await fs.mkdtemp(path.join(os.tmpdir(),'adnan-pages-'));
const tracked=execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
// Copy only tracked, public-safe source. Never copy local .env, databases, or runtime uploads.
for(const file of tracked){if(file.startsWith('src/app/api/')||file.startsWith('src/app/admin/')||file.startsWith('src/app/uploads/'))continue;const dest=path.join(temp,file);await fs.mkdir(path.dirname(dest),{recursive:true});await fs.copyFile(path.join(root,file),dest);}
await fs.cp(path.join(root,'src/generated/cloud'),path.join(temp,'src/generated/cloud'),{recursive:true});
await fs.symlink(path.join(root,'node_modules'),path.join(temp,'node_modules'),process.platform==='win32'?'junction':'dir');
for(const file of ['src/app/page.tsx','src/app/(site)/layout.tsx','src/app/sitemap.ts']){const p=path.join(temp,file);await fs.writeFile(p,(await fs.readFile(p,'utf8')).replace(/export const dynamic = 'force-dynamic'/g,"export const dynamic = 'force-static'"));}
for(const file of ['src/app/robots.ts','src/app/opengraph-image.tsx']){const p=path.join(temp,file);await fs.writeFile(p,"export const dynamic = 'force-static'\n"+await fs.readFile(p,'utf8'));}
await fs.mkdir(path.join(temp,'src/app/admin/login'),{recursive:true});
const adminPage = "export const metadata = { robots: { index: false, follow: false } }\nexport { default } from '@/features/admin/components/GitContentAdmin'\n";
await fs.writeFile(path.join(temp,'src/app/admin/page.tsx'),adminPage);
await fs.writeFile(path.join(temp,'src/app/admin/login/page.tsx'),adminPage);
const env={...process.env,STATIC_EXPORT:'true',PORTFOLIO_CONTENT_MODE:'git',NEXT_PUBLIC_STATIC_SITE:'true',NEXT_PUBLIC_SITE_URL:'https://sayyedadnan0.github.io',SITE_INDEXABLE:'true',DATABASE_URL:'file:./unused-pages.db'};
const result=spawnSync(process.execPath,[path.join(root,'node_modules/next/dist/bin/next'),'build','--webpack'],{cwd:temp,env,stdio:'inherit'});
if(result.status!==0)throw new Error('Static build failed; review '+temp);
const output=path.resolve(root,'out-pages');
if(await fs.stat(output).catch(()=>null)){if(path.dirname(output)!==root||!await fs.stat(path.join(output,'.adnan-pages-output')).catch(()=>null))throw new Error('Refusing to replace an unowned output directory');await fs.rm(output,{recursive:true});}
await fs.cp(path.join(temp,'out'),output,{recursive:true});
await fs.writeFile(path.join(output,'.nojekyll'),'');
await fs.writeFile(path.join(output,'.adnan-pages-output'),'generated');
const catalog=JSON.parse(await fs.readFile(path.join(root,'prisma/data/portfolio.json'),'utf8'));
for(const route of ['','about','work','contact','admin',...catalog.projects.filter(p=>p.published).map(p=>'work/'+p.slug)])await fs.access(path.join(output,route,'index.html'));
const html=await fs.readFile(path.join(output,'index.html'),'utf8');
if(!html.includes('ADNAN')||html.includes('localhost:3000'))throw new Error('Invalid production homepage');
console.log('Verified static export: '+output);
