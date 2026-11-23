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

test('All 4 resume tabs switch cleanly and run their dedicated ATS engines', async () => {
  const dom = await createApp();
  const { document, switchTab, runATS } = dom.window;

  for (const type of ['internship', 'fresher', 'professional', 'executive']) {
    switchTab(type);
    const page = document.getElementById(`form-${type}`);
    assert.equal(page.style.display, 'block', `form-${type} should be visible`);
    const res = runATS(type, { name: 'Jane Doe', email: 'jane@example.com', phone: '5551234567' });
    assert.ok(res && typeof res.score === 'number', `ATS engine for ${type} should return numeric score`);
    assert.ok(Array.isArray(res.categories) && res.categories.length > 0, `${type} should return categories`);
  }
  dom.window.close();
});

test('Target JD matcher calculates match percentage and renders matched/missing chips', async () => {
  const dom = await createApp();
  const { document, onJDChange, generateResume } = dom.window;

  document.getElementById('pro-name').value = 'Jane Doe';
  document.getElementById('pro-skills-languages').value = 'Python, TypeScript, Go';
  document.getElementById('pro-skills-cloud').value = 'AWS, Kubernetes, Docker';
  document.getElementById('target-jd-input').value =
    'Looking for a Senior Engineer with Python, TypeScript, AWS, Kubernetes, Terraform, and GraphQL experience.';
  onJDChange();
  generateResume('professional');

  const badge = document.getElementById('jd-match-badge').textContent;
  assert.ok(badge.includes('% Match'), `expected % Match badge, got: ${badge}`);
  const chips = document.getElementById('jd-match-details').textContent;
  assert.ok(chips.includes('python') || chips.includes('aws'), 'should render keyword chips');
  dom.window.close();
});
