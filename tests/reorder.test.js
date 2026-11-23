const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8');

async function createApp() {
  const dom = new JSDOM(html, {
    url: 'http://localhost/',
    runScripts: 'dangerously',
    beforeParse(win) {
      win.confirm = () => true;
      win.requestAnimationFrame = (cb) => setTimeout(cb, 0);
    }
  });
  await new Promise((r) => setTimeout(r, 140));
  return dom;
}

test('Cards in any section can be moved up and down within that section', async () => {
  const dom = await createApp();
  const { document, addEntry, collectData } = dom.window;

  const container = document.getElementById('pro-experience-container');
  addEntry('professional', 'experience', { role: 'Second Role' }, true);
  addEntry('professional', 'experience', { role: 'Third Role' }, true);

  const cards = container.querySelectorAll('.entry-card');
  cards[0].querySelector('[data-field="role"]').value = 'First Role';

  const getOrder = () => [...container.querySelectorAll('[data-field="role"]')].map((el) => el.value);
  assert.deepEqual(getOrder(), ['First Role', 'Second Role', 'Third Role']);

  // Move third card up once
  cards[2].querySelector('button[aria-label="Move card up"]').click();
  assert.deepEqual(getOrder(), ['First Role', 'Third Role', 'Second Role']);

  // Move first card down once
  container.querySelectorAll('.entry-card')[0].querySelector('button[aria-label="Move card down"]').click();
  assert.deepEqual(getOrder(), ['Third Role', 'First Role', 'Second Role']);

  // Boundary check: moving top card up or bottom card down is a safe no-op
  container.querySelectorAll('.entry-card')[0].querySelector('button[aria-label="Move card up"]').click();
  container.querySelectorAll('.entry-card')[2].querySelector('button[aria-label="Move card down"]').click();
  assert.deepEqual(getOrder(), ['Third Role', 'First Role', 'Second Role']);

  const collected = Array.from(collectData('professional').experience, (e) => e.role);
  assert.deepEqual(collected, ['Third Role', 'First Role', 'Second Role']);
  dom.window.close();
});
