// The alert script builds from this folder, so copy the app's scheduling logic in before building.
const fs = require('fs');
const path = require('path');

const from = path.join(__dirname, '..', '..', 'src', 'lib');
const to = path.join(__dirname, '..', 'src', 'shared');
fs.mkdirSync(to, { recursive: true });
for (const f of ['schedule.ts', 'types.ts']) {
  fs.copyFileSync(path.join(from, f), path.join(to, f));
}
