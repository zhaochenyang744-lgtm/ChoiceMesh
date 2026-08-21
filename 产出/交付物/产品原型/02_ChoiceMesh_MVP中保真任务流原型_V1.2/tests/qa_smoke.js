const { chromium } = require('playwright');
const { pathToFileURL } = require('url');
const path = require('path');

function active(page) { return page.locator('.screen.active'); }
async function expectText(locator, expected) {
  const actual = (await locator.textContent()).replace(/\s+/g, ' ').trim();
  if (!actual.includes(expected)) throw new Error(`Expected "${expected}", got "${actual}".`);
}
async function expectNoPrivateIdentity(page) {
  const text = await page.locator('body').innerText();
  for (const name of ['Lin', 'Maya', 'Bo', 'Jun']) {
    if (text.includes(name)) throw new Error(`Shared UI leaked a member identity: ${name}`);
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) });
  try {
    const page = await browser.newPage();
    const prototypeRoot = path.join(__dirname, '..');
    const artifactRoot = path.join(__dirname, 'artifacts');
    await page.goto(pathToFileURL(path.join(prototypeRoot, 'index.html')).href);
    await page.waitForLoadState('load');
    await page.waitForTimeout(300);

    // First sight: waiting for a first reply and waiting for a personal verification are distinct.
    await expectText(active(page), '等待 1 位成员提交第一条反馈');
    await expectText(active(page), '你的 1 项条件已回复，待你核实');
    await expectText(active(page), '不会替对方回复');
    await expectNoPrivateIdentity(page);
    await page.screenshot({ path: path.join(artifactRoot, 'qa-initial.png'), fullPage: true });

    // Path A: need-more-time remains pending, then the current member confirms and publishes.
    await page.getByRole('button', { name: '核实我的条件' }).click();
    await page.getByRole('button', { name: '我需要更多时间' }).click();
    await expectText(page.locator('#member-notice'), '不会自动变成确认或缺席');
    await expectText(active(page), '有预计时间');
    await page.getByRole('button', { name: '返回当前待办' }).click();
    await page.getByText('测试员控制（不属于正式产品）', { exact: true }).click();
    await page.getByRole('button', { name: '模拟：收到一位成员本人反馈' }).click();
    await page.getByRole('button', { name: '核实我的条件' }).click();
    await page.getByRole('button', { name: '我已核实，可以参加' }).click();
    await page.getByRole('button', { name: '候选比较', exact: true }).click();
    const provisional = page.getByRole('button', { name: '暂定 C' });
    if (await provisional.isDisabled()) throw new Error('暂定 C should be enabled after required confirmations.');
    await provisional.click();
    await page.locator('#publish-check').check();
    await page.getByRole('button', { name: '发布 C' }).click();
    await expectText(active(page), '4 人已确认（实际人数）');
    await page.getByRole('button', { name: '重新比较候选' }).click();
    await page.getByRole('button', { name: '候选比较', exact: true }).click();
    await expectText(active(page), '当前没有其他可推进的候选');
    await page.getByRole('button', { name: '新增候选' }).click();
    await expectText(page.locator('#no-options-notice'), '由任一成员补充一个已有候选');

    // Path B: decline, explicit acceptance, then category-level risk is hidden for the smaller group.
    await page.reload();
    await page.waitForLoadState('load');
    await page.getByText('测试员控制（不属于正式产品）', { exact: true }).click();
    await page.getByRole('button', { name: '模拟：收到一位成员本人反馈' }).click();
    await page.getByRole('button', { name: '我的条件', exact: true }).click();
    await page.getByRole('button', { name: '确认无法参加' }).click();
    await page.getByRole('button', { name: '候选比较', exact: true }).click();
    await page.getByRole('button', { name: '按 3 人规则接受一位成员缺席' }).click();
    await expectText(page.locator('#risk-cell'), '存在 1 项已验证风险');
    await expectText(page.locator('#risk-disclosure-note'), '不显示风险类别');
    if (await page.getByRole('button', { name: '暂定 C' }).isDisabled()) throw new Error('暂定 C should be enabled after accepting absence.');
    await expectNoPrivateIdentity(page);
    await page.screenshot({ path: path.join(artifactRoot, 'qa-overview.png'), fullPage: true });
    console.log('PASS: ChoiceMesh iteration paths and privacy rules completed.');
  } finally { await browser.close(); }
})().catch((error) => { console.error(`FAIL: ${error.message}`); process.exitCode = 1; });
