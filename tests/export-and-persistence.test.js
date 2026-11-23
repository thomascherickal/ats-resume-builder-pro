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
      win.URL.createObjectURL = () => 'blob:mock';
      win.URL.revokeObjectURL = () => {};
    }
  });
  await new Promise((r) => setTimeout(r, 140));
  return dom;
}

test('downloadPDF opens Light and Dark mode printable documents', async () => {
  const dom = await createApp();
  const win = dom.window;
  let written = '';
  win.open = () => ({
    document: { write(s) { written = s; }, close() {} }
  });

  win.document.getElementById('pro-name').value = 'Sam Lee';
  win.generateResume('professional');

  win.downloadPDF('professional', 'light');
  assert.ok(written.includes('Light Mode'), 'light PDF should include Light Mode title');

  win.downloadPDF('professional', 'dark');
  assert.ok(written.includes('Dark Mode') && written.includes('dark-mode'), 'dark PDF should include dark-mode class');
  dom.window.close();
});

test('flushAllToStorage persists edits on exit and removeEntry removes a card', async () => {
  const dom = await createApp();
  const { document, flushAllToStorage, addEntry, removeEntry, localStorage } = dom.window;

  document.getElementById('int-name').value = 'Priya Nair';
  flushAllToStorage();
  const stored = localStorage.getItem('ats_resume_v1_internship');
  assert.ok(stored && stored.includes('Priya Nair'), 'flushAllToStorage should save internship JSON');

  const container = document.getElementById('int-projects-container');
  addEntry('internship', 'project', { name: 'Temp Project' }, true);
  const countBefore = container.querySelectorAll('.entry-card').length;
  const lastId = container.lastElementChild.id.replace('entry-', '');
  removeEntry(lastId);
  await new Promise((r) => setTimeout(r, 250));
  assert.equal(container.querySelectorAll('.entry-card').length, countBefore - 1, 'removeEntry should remove card');
  dom.window.close();
});
