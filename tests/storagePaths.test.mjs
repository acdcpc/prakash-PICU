import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPatientImagePath, parsePatientImagePath, isPathForPatient, sanitizeFileName, isPatientId } from '../src/lib/storagePaths.js';

const P1 = '123e4567-e89b-12d3-a456-426614174000';
const P2 = 'aaaabbbb-cccc-dddd-eeee-ffffffffffff';

test('builds a well-formed patient-scoped path and sanitises the file name', () => {
  const path = buildPatientImagePath(P1, 'Chest X-ray (AP).png', 1700000000000);
  assert.equal(path, `patients/${P1}/1700000000000_Chest_X-ray__AP_.png`);
  assert.deepEqual(parsePatientImagePath(path), { patientId: P1, fileName: '1700000000000_Chest_X-ray__AP_.png' });
  assert.throws(() => buildPatientImagePath('not-a-uuid', 'x.png'), /valid patient id/);
});

test('rejects malformed and missing-patient paths', () => {
  for (const bad of [null, undefined, '', 'patients', 'patients/', 'patients//x.png', 'patients/not-a-uuid/x.png', '/patients/' + P1 + '/x.png', 'x/y/z', 'patients/' + P1, 'patients/' + P1 + '/a/b.png']) {
    assert.equal(parsePatientImagePath(bad), null, `expected null for ${JSON.stringify(bad)}`);
  }
});

test('rejects traversal-like paths', () => {
  for (const bad of ['patients/../../etc/passwd', 'patients/' + P1 + '/..%2f..', 'patients/..', `patients/${P1}/../${P2}/x.png`, 'patients\\' + P1 + '\\x.png']) {
    assert.equal(parsePatientImagePath(bad), null, `expected null for ${JSON.stringify(bad)}`);
  }
});

test('cross-patient paths are not treated as belonging to the viewed patient', () => {
  const otherPatientPath = `patients/${P2}/1700000000000_x.png`;
  assert.deepEqual(parsePatientImagePath(otherPatientPath), { patientId: P2, fileName: '1700000000000_x.png' });
  assert.equal(isPathForPatient(otherPatientPath, P1), false);
  assert.equal(isPathForPatient(`patients/${P1}/1700000000000_x.png`, P1), true);
  assert.equal(isPathForPatient('patients/not-a-uuid/x.png', P1), false);
});

test('file-name sanitiser strips directories, control characters, and traversal', () => {
  assert.equal(sanitizeFileName('../../etc/passwd'), 'passwd');
  assert.equal(sanitizeFileName('C:\\Users\\x\\scan.png'), 'scan.png');
  assert.equal(sanitizeFileName('..hidden'), 'hidden');
  assert.equal(sanitizeFileName('a\u0000b.png'), 'ab.png');
  assert.equal(sanitizeFileName(''), 'image.jpg');
  assert.equal(isPatientId(P1), true);
  assert.equal(isPatientId('nope'), false);
});
