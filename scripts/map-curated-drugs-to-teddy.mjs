#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { DRUGS } from '../src/lib/clinicalTools.js';
const audit=JSON.parse(readFileSync(process.argv[2] || '.clinical-private/teddy-audit/audit.json','utf8'));
for(const drug of DRUGS){
  const key=drug.name.toLowerCase().replace(/\(.*?\)/g,'').replace(/[^a-z0-9]+/g,' ').trim();
  const matches=audit.records.filter(r=>r.likelyMonograph&&r.name.toLowerCase().replace(/\(.*?\)/g,'').replace(/[^a-z0-9]+/g,' ').includes(key.split(' ')[0])&&r.name.toLowerCase().includes(key.split(' ')[0]));
  const flagged=matches.filter(r=>r.findings.length>0);
  console.log(JSON.stringify({drug:drug.name,appDose:`${drug.dose} ${drug.unit}`,matches:matches.slice(0,4).map(r=>({name:r.name,offset:r.sourceOffset,findings:[...new Set(r.findings.map(f=>f.type))],doses:r.doseExpressions.slice(0,8)})),flagged:flagged.length}));
}
