const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const htmlPath = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');

async function createApp(initialStorage = {}) {
  const dom = new JSDOM(html, {
    url: 'http://localhost/',
    runScripts: 'dangerously',
    beforeParse(win) {
      win.confirm = () => true;
      win.requestAnimationFrame = (cb) => setTimeout(cb, 0);
      Object.entries(initialStorage).forEach(([k, v]) => win.localStorage.setItem(k, v));
    }
  });
  await new Promise((r) => setTimeout(r, 140));
  return dom;
}

test('Add Role button under Work Experience adds role cards across all forms', async () => {
  const dom = await createApp();
  const { document } = dom.window;

  for (const [type, prefix] of [['internship', 'int'], ['fresher', 'fre'], ['professional', 'pro'], ['executive', 'exe']]) {
    const container = document.getElementById(`${prefix}-experience-container`);
    assert.ok(container, `${prefix}-experience-container must exist`);
    const initialCount = container.querySelectorAll('.entry-card').length;
    assert.equal(initialCount, 1, `${type} should seed 1 experience card`);

    const addBtn = document.querySelector(`#form-${type} button[onclick*="addEntry('${type}','experience')"]`);
    assert.ok(addBtn, `${type} Add Role/Experience button must exist`);
    addBtn.click();

    const afterCount = container.querySelectorAll('.entry-card').length;
    assert.equal(afterCount, initialCount + 1, `${type} clicking Add Role must append a new card`);
  }
  dom.window.close();
});

test('Generate creates both Light Mode and Dark Mode resume previews', async () => {
  const dom = await createApp();
  const { document, generateResume } = dom.window;

  document.getElementById('pro-name').value = 'Jane Doe';
  document.getElementById('pro-email').value = 'jane@example.com';
  generateResume('professional');

  const preview = document.getElementById('resume-preview-container');
  assert.ok(preview.textContent.includes('Light Mode'), 'should render Light Mode header');
  assert.ok(preview.textContent.includes('Dark Mode'), 'should render Dark Mode header');
  assert.equal(preview.querySelectorAll('.resume-doc').length, 2, 'should render 2 resume versions');
  assert.equal(preview.querySelectorAll('.resume-doc.dark-mode').length, 1, 'should render 1 dark-mode resume');
  dom.window.close();
});

test('ATS Score report explains gaps below 100% and Check ATS Score button switches panes', async () => {
  const dom = await createApp();
  const { document, generateResume } = dom.window;

  generateResume('internship');
  const atsBtn = document.querySelector('button[aria-label="Check ATS Score"]');
  assert.ok(atsBtn && atsBtn.textContent.includes('Check ATS Score'));
  atsBtn.click();

  assert.equal(document.getElementById('ats-pane').style.display, 'block');
  const report = document.getElementById('ats-score-container').textContent;
  assert.ok(report.includes('Why your score is below 100%'), 'should show overall gap banner');
  assert.ok(report.includes('Why below 100%:'), 'should show per-category gap explanation');
  assert.ok(report.includes('Changes to reach 100%:'), 'should list required changes');
  dom.window.close();
});

test('Data persists to localStorage, reloads on startup, and Reset clears all panes', async () => {
  const dom1 = await createApp();
  dom1.window.document.getElementById('pro-name').value = 'Alex Rivera';
  dom1.window.generateResume('professional');
  const saved = dom1.window.localStorage.getItem('ats_resume_v1_professional');
  assert.ok(saved && saved.includes('Alex Rivera'), 'should persist professional pane JSON');
  dom1.window.close();

  const dom2 = await createApp({ ats_resume_v1_professional: saved });
  assert.equal(dom2.window.document.getElementById('pro-name').value, 'Alex Rivera', 'should auto-reload saved data');
  assert.equal(dom2.window.document.querySelectorAll('button[onclick*="resetAllData"]').length, 2, 'Preview and ATS panes have Reset');

  dom2.window.resetAllData();
  assert.equal(dom2.window.document.getElementById('pro-name').value, '', 'Reset should clear form inputs');
  assert.equal(dom2.window.localStorage.getItem('ats_resume_v1_professional'), null, 'Reset should clear localStorage');
  dom2.window.close();
});
