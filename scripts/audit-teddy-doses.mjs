#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve(process.argv[2] || '.clinical-private/drug-reference/source.txt');
const indexPath = resolve(process.argv[3] || '.clinical-private/drug-reference/monograph-index.json');
const outputDir = resolve(process.argv[4] || '.clinical-private/teddy-audit');
mkdirSync(outputDir, { recursive: true });
const source = readFileSync(sourcePath, 'utf8');
const index = JSON.parse(readFileSync(indexPath, 'utf8'));
const ordered = [...index.monographs].sort((a, b) => Number(a.sourceOffset) - Number(b.sourceOffset));

const doseExpression = /\b\d+(?:\.\d+)?(?:\s*(?:-|–|to)\s*\d+(?:\.\d+)?)?\s*(?:mcg|μg|ug|mg|g|mEq|mmol|units?|IU|mL|L|%)(?:\s*\/\s*(?:kg|m2|m\^2|hr|h|min|day|dose|dose\/kg))?(?:\s*(?:\/|per)\s*(?:kg|m2|m\^2|hr|h|min|day|dose))?/gi;
const doseKeyword = /\b(?:dose|dosage|dosing|maximum|max(?:imum)?|loading|maintenance|infusion|rate|dilution|concentration|administration)\b/i;
const unitPattern = /(?:mcg|μg|ug|mg|g|mEq|mmol|units?|IU|mL|L|%)(?:\s*\/\s*(?:kg|m2|m\^2|hr|h|min|day|dose))?/i;
const ratePattern = /(?:per|\/|·)\s*(?:kg|m2|m\^2|hr|h|min|day|dose)|(?:q\s*\d+|every\s+\d+|continuous|infusion|over\s+\d+)/i;
const concentrationPattern = /\b\d+(?:\.\d+)?\s*(?:mg|mcg|g|mEq|mmol|units?|IU)\s*\/\s*\d+(?:\.\d+)?\s*(?:mL|L)\b/gi;
const monographSignals = /\b(?:indications?|dos(?:e|age|ing)|administration|contraindications?|warnings?|precautions?|interactions?|monitoring|pediatric|paediatric|pharmacology|adverse|preparation|dilution|compatibility|renal|hepatic)\b/gi;
const suspiciousUnitPattern = /\b(?:mg\/kg\/min|mcg\/kg\/hr|mcg\/kg\/min|units?\/kg\/hr|mEq\/kg\/hr)\b/i;

function segment(item, position) {
  const start = Number(item.sourceOffset) || 0;
  const end = position + 1 < ordered.length ? Number(ordered[position + 1].sourceOffset) || source.length : source.length;
  return source.slice(start, end).trim();
}

function lineFindings(content) {
  const lines = content.split(/\r?\n/);
  const findings = [];
  lines.forEach((line, index) => {
    if (!doseKeyword.test(line) || !/\d/.test(line)) return;
    const hasUnit = unitPattern.test(line);
    const hasRateContext = ratePattern.test(line);
    if (!hasUnit) findings.push({ type: 'missing-unit-candidate', severity: 'review', line: index + 1, excerpt: line.trim().slice(0, 260) });
    if (/\b(?:dose|dosage|maximum|max(?:imum)?|loading|maintenance)\b/i.test(line) && hasUnit && !hasRateContext && /\b(?:kg|m2|m\^2|body surface|weight)\b/i.test(line)) {
      findings.push({ type: 'incomplete-weight-context-candidate', severity: 'review', line: index + 1, excerpt: line.trim().slice(0, 260) });
    }
  });
  return findings;
}

const records = ordered.map((item, position) => {
  const content = segment(item, position);
  const signals = [...content.matchAll(monographSignals)].length;
  const likelyMonograph = content.length >= 500 && signals >= 2;
  const doses = [...content.matchAll(doseExpression)].map((match) => match[0].replace(/\s+/g, ' ').trim());
  const concentrations = [...content.matchAll(concentrationPattern)].map((match) => match[0].replace(/\s+/g, ' ').trim());
  const unitFamilies = [...new Set(doses.map((dose) => (dose.match(/(?:mcg|μg|ug|mg|g|mEq|mmol|units?|IU|mL|L|%)/i) || ['unknown'])[0].toLowerCase()))];
  const findings = lineFindings(content);
  if (suspiciousUnitPattern.test(content)) findings.push({ type: 'unit-context-review', severity: 'high', excerpt: 'Contains a high-alert rate unit requiring explicit clinical verification.' });
  if (concentrations.length > 1) findings.push({ type: 'multiple-concentrations', severity: 'review', excerpt: concentrations.slice(0, 4).join('; ') });
  if (unitFamilies.length > 1 && doses.length > 1) findings.push({ type: 'multiple-dose-unit-families', severity: 'review', excerpt: unitFamilies.join(', ') });
  if (doseKeyword.test(content) && doses.length === 0) findings.push({ type: 'dose-keyword-without-parseable-dose', severity: 'review', excerpt: content.slice(0, 240).replace(/\s+/g, ' ') });
  return { id: item.id, name: item.name, sourceOffset: item.sourceOffset, likelyMonograph, signals, doseExpressions: doses.slice(0, 80), concentrations: concentrations.slice(0, 40), findings };
});

const summary = {
  source: index.source,
  generatedAt: new Date().toISOString(),
  records: records.length,
  recordsWithDoseExpressions: records.filter((record) => record.doseExpressions.length > 0).length,
  likelyMonographs: records.filter((record) => record.likelyMonograph).length,
  likelyMonographsWithFindings: records.filter((record) => record.likelyMonograph && record.findings.length > 0).length,
  recordsWithFindings: records.filter((record) => record.findings.length > 0).length,
  findingCounts: Object.fromEntries([...new Set(records.flatMap((record) => record.findings.map((finding) => finding.type)))].map((type) => [type, records.reduce((count, record) => count + record.findings.filter((finding) => finding.type === type).length, 0)])),
  clinicalValidationNotice: 'Structural text audit only. Findings require clinician review and do not establish that any dose is correct or incorrect.',
};
writeFileSync(resolve(outputDir, 'audit.json'), JSON.stringify({ summary, records }, null, 2));
const flagged = records.filter((record) => record.likelyMonograph && record.findings.length > 0);
const markdown = `# Teddy Bear dosage structural audit\n\nGenerated: ${summary.generatedAt}\n\n> This is a structural text audit of the imported monograph segments. It detects missing-unit candidates, multiple unit/concentration patterns, and dose-like text that needs review. It cannot certify clinical correctness.\n\n| Metric | Result |\n|---|---:|\n| Indexed segments | ${summary.records} |\n| Segments with dose-like expressions | ${summary.recordsWithDoseExpressions} |\n| Likely drug-monograph segments | ${summary.likelyMonographs} |\n| Likely monographs with structural findings | ${summary.likelyMonographsWithFindings} |\n| All segments with structural findings (including index fragments) | ${summary.recordsWithFindings} |\n| Missing-unit candidates | ${summary.findingCounts['missing-unit-candidate'] || 0} |\n| Dose keywords without parseable dose | ${summary.findingCounts['dose-keyword-without-parseable-dose'] || 0} |\n| Multiple concentrations | ${summary.findingCounts['multiple-concentrations'] || 0} |\n| Multiple dose-unit families | ${summary.findingCounts['multiple-dose-unit-families'] || 0} |\n| High-alert rate-unit review candidates | ${summary.findingCounts['unit-context-review'] || 0} |\n\n## Flagged records\n\n| Record | Findings | Example dose expressions |\n|---|---|---|\n${flagged.slice(0, 300).map((record) => `| ${record.name.replace(/\|/g, '\\|')} | ${[...new Set(record.findings.map((finding) => finding.type))].join(', ')} | ${(record.doseExpressions.slice(0, 3).join('; ') || '—').replace(/\|/g, '\\|')} |`).join('\n')}\n\nThe complete machine-readable output is in the private audit directory. The clinical team should review every flagged record and then perform a full clinical validation of all records before promotion into prescribing calculators.\n`;
writeFileSync(resolve(outputDir, 'audit.md'), markdown);
console.log(JSON.stringify(summary, null, 2));
