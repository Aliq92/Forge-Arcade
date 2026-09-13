const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const textFiles = ['index.html', 'app.js'];

test('APOGEE is fully removed from the arcade launcher', () => {
  expect(fs.existsSync(path.join(root, 'apogee-register.js'))).toBe(false);
  expect(fs.existsSync(path.join(root, 'games', 'apogee'))).toBe(false);

  for (const file of textFiles) {
    const fullPath = path.join(root, file);
    if (!fs.existsSync(fullPath)) continue;
    const text = fs.readFileSync(fullPath, 'utf8');
    expect(text.toLowerCase()).not.toContain('apogee');
  }
});
