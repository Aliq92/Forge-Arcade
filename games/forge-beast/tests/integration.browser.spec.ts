import { test, expect, type Page } from '@playwright/test';
import { Engine } from '../src/systems/Engine';
const key = 'forge-arcade:forge-beast:v1', route = '/games/forge-beast/index.html';
const baby = () => { const e = new Engine(null, () => .99); e.debugHatch(); e.state.stats.hunger = 80; return e; };
async function seed(page: Page, state: unknown) { await page.goto('/'); await page.evaluate(({ key, state }) => localStorage.setItem(key, JSON.stringify(state)), { key, state }); }
const read = (page: Page) => page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key);
async function menu(page: Page, index: number) {
    await page.locator('.fb-button-c').click();
    await page.locator('.fb-button-c').click();
    for (let i = 0; i < index; i++)
        await page.locator('.fb-button-a').click();
    await page.locator('.fb-button-b').click();
}
test('native launcher loads UI lazily and preserves care and summary across browser back', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', r => requests.push(r.url()));
    await page.clock.install();
    await page.goto('/');
    const tile = page.locator('[data-game="forge-beast"]');
    await expect(tile).toContainText('A new egg is waiting');
    expect(requests.some(url => /module\/forge-beast\.(js|css)/.test(url))).toBe(false);
    await tile.click();
    await expect(page.locator('.fb-device')).toHaveCount(1);
    await expect(page.locator('.fb-header')).toBeHidden();
    await page.clock.runFor(46000);
    await expect(page.locator('.fb-creature-label h2')).toHaveText('PIPKIN');
    await page.locator('.fb-button-b').click();
    await expect(page.locator('.fb-world')).toHaveAttribute('data-action', 'feed');
    const saved = await read(page);
    await page.goBack();
    await expect(tile).toContainText('Pipkin — Baby');
    await tile.click();
    expect((await read(page)).personality).toBe(saved.personality);
    await page.locator('#arcade-back').click();
    await expect(tile).toContainText('Pipkin');
});
test('host pause and hidden state preserve one clock; URL debug never leaks', async ({ page }) => {
    await page.clock.install();
    await page.goto(`${route}?debug=1`);
    await expect(page.locator('.fb-device')).toBeVisible();
    await expect(page.locator('.fb-debug')).toHaveCount(0);
    await page.clock.runFor(6000);
    await page.locator('#arcade-pause').click();
    const before = await read(page);
    await page.clock.runFor(60000);
    await expect(page.locator('.forge-beast')).toHaveClass(/fb-paused/);
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); });
    await page.clock.runFor(60000);
    expect((await read(page)).age).toBe(before.age);
    await page.locator('#arcade-pause').click();
    await page.clock.runFor(6000);
    const after = await read(page);
    expect(after.age - before.age).toBeGreaterThan(4);
    expect(after.age - before.age).toBeLessThan(7);
});
test('portrait mobile and landscape fit inside Arcade without scrolling or CSS leakage', async ({ page }) => {
    for (const [width, height] of [[320, 568], [360, 640], [375, 667], [412, 915], [740, 360]]) {
        await page.setViewportSize({ width, height });
        await page.goto(route);
        await expect(page.locator('.fb-device')).toBeVisible();
        await expect.poll(async () => { const v = (await page.locator('#game-viewport').boundingBox())!, d = (await page.locator('.fb-device').boundingBox())!; return d.x >= v.x - 1 && d.y >= v.y - 1 && d.x + d.width <= v.x + v.width + 1 && d.y + d.height <= v.y + v.height + 1; }).toBe(true);
        for (const letter of ['a', 'b', 'c']) {
            const b = (await page.locator(`.fb-button-${letter}`).boundingBox())!;
            expect(b.y + b.height).toBeLessThanOrEqual(height);
            if (height >= 568) {
                expect(b.width).toBeGreaterThanOrEqual(44);
                expect(b.height).toBeGreaterThanOrEqual(44);
            }
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
        expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(height);
        if (width === 375)
            await page.screenshot({ path: '/tmp/arcade-forge-beast-mobile.png' });
    }
    await page.locator('#arcade-back').click();
    expect(await page.locator('link[href*="forge-beast.css"]').count()).toBe(0);
});
test('expedition restores its active-time remainder and resolves only once after repeated exits', async ({ page }) => {
    await page.clock.install();
    await seed(page, baby().state);
    await page.goto(route);
    await menu(page, 5);
    await expect(page.locator('.fb-status-heading')).toContainText('Explore');
    await page.locator('.fb-button-b').click();
    await page.locator('.fb-button-b').click();
    await page.clock.runFor(5000);
    await page.locator('#arcade-back').click();
    const departure = await read(page);
    expect(departure.exploration.active).toBeTruthy();
    for (let i = 0; i < 3; i++) {
        await page.clock.fastForward(120000);
        await page.locator('[data-game="forge-beast"]').click();
        await expect(page.locator('.fb-world')).toHaveAttribute('data-expedition', /traveling|leaving/);
        await page.locator('#arcade-back').click();
    }
    const restored = await read(page);
    expect(restored.exploration.active.startedAt).toBe(departure.exploration.active.startedAt);
    expect(restored.age - departure.age).toBeLessThan(2);
    await page.locator('[data-game="forge-beast"]').click();
    await page.clock.runFor(17000);
    await page.locator('#arcade-back').click();
    const done = await read(page);
    expect(done.exploration.statistics.completed).toBe(1);
    for (let i = 0; i < 3; i++) {
        await page.locator('[data-game="forge-beast"]').click();
        await page.locator('#arcade-back').click();
    }
    const final = await read(page);
    expect(final.exploration.statistics).toEqual(done.exploration.statistics);
    expect(final.exploration.inventory).toEqual(done.exploration.inventory);
    expect(final.exploration.discoveries).toEqual(done.exploration.discoveries);
});
test('battle exits restore the resolved turn and never duplicate damage or terminal rewards', async ({ page }) => {
    const e = baby();
    e.debugBattle('flinthop');
    e.advance(1);
    e.battleAction('skill');
    await page.clock.install();
    await seed(page, e.state);
    await page.goto(route);
    await expect(page.locator('.fb-battle-arena')).toBeVisible();
    const before = await read(page);
    for (let i = 0; i < 4; i++) {
        await page.locator('#arcade-back').click();
        await page.locator('[data-game="forge-beast"]').click();
    }
    const after = await read(page);
    expect(after.combat.active.player).toEqual(before.combat.active.player);
    expect(after.combat.active.enemy).toEqual(before.combat.active.enemy);
    expect(after.combat.active.beats).toEqual([]);
    expect(after.combat.active.turn).toBe(before.combat.active.turn);
    const won = baby();
    won.debugBattle('flinthop');
    won.debugBattleResult('victory');
    await page.locator('#arcade-back').click();
    await page.evaluate(({ key, state }) => localStorage.setItem(key, JSON.stringify(state)), { key, state: won.state });
    for (let i = 0; i < 4; i++) {
        await page.locator('[data-game="forge-beast"]').click();
        await expect(page.locator('.fb-battle-result')).toBeVisible();
        await page.locator('#arcade-back').click();
    }
    const result = await read(page);
    expect(result.combat.statistics.wins).toBe(1);
    expect(result.exploration.inventory).toEqual(won.state.exploration.inventory);
    expect(result.combat.history).toHaveLength(1);
});
test('player reset is confirmed and isolated; malformed save is preserved', async ({ page }) => {
    await page.clock.install();
    await seed(page, baby().state);
    await page.evaluate(() => { localStorage.setItem('arcade.settings', 'keep'); localStorage.setItem('other.game', 'keep'); });
    await page.goto(route);
    await menu(page, 4);
    for (let i = 0; i < 6; i++)
        await page.locator('.fb-button-a').click();
    await expect(page.locator('.fb-status-heading')).toContainText('Settings');
    for (let i = 0; i < 2; i++)
        await page.locator('.fb-button-a').click();
    await page.locator('.fb-button-b').click();
    await page.locator('.fb-button-c').click();
    expect((await read(page)).stage).toBe('baby');
    await page.locator('.fb-button-b').click();
    await page.locator('.fb-button-a').click();
    await page.locator('.fb-button-b').click();
    expect((await read(page)).stage).toBe('egg');
    for (const k of ['arcade.settings', 'other.game'])
        expect(await page.evaluate(k => localStorage.getItem(k), k)).toBe('keep');
    await page.locator('#arcade-back').click();
    await page.evaluate(key => localStorage.setItem(key, '{broken'), key);
    await page.locator('[data-game="forge-beast"]').click();
    await expect(page.locator('#game-message')).toContainText('protected');
    await page.locator('#arcade-back').click();
    expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe('{broken');
});
test('failed lazy import offers a working launcher return and preserves save', async ({ page }) => {
    await seed(page, baby().state);
    await page.route('**/module/forge-beast.js', r => r.abort());
    await page.locator('[data-game="forge-beast"]').click();
    await expect(page.locator('#game-message')).toContainText('could not open');
    await page.locator('#arcade-back').click();
    await expect(page.locator('[data-game="forge-beast"]')).toContainText('Pipkin');
});
test('real host cycles release timers, listeners, observers, audio and device DOM', async ({ page }) => {
    await page.clock.install();
    await page.goto(route);
    await expect(page.locator('.fb-device')).toBeVisible();
    await page.evaluate(async () => {
        const w = window as any;
        // @ts-expect-error native runtime URL
        const { ArcadeGameHost } = await import('/game-host.mjs');
        // @ts-expect-error native runtime URL
        const runtime = await import('/games/forge-beast/module/forge-beast.js');
        const root = document.createElement('div');
        root.id = 'audit-root';
        root.style.cssText = 'position:fixed;inset:48px 0 0;z-index:30';
        document.body.append(root);
        const intervals = new Set(), listeners = new Set(), observers = new Set();
        const set = window.setInterval.bind(window), clear = window.clearInterval.bind(window);
        window.setInterval = ((...args: any[]) => { const id = (set as any)(...args); intervals.add(id); return id; }) as any;
        window.clearInterval = id => { intervals.delete(id); clear(id); };
        const add = EventTarget.prototype.addEventListener, remove = EventTarget.prototype.removeEventListener;
        EventTarget.prototype.addEventListener = function (type, fn, options) { if (fn && [document, window, root].includes(this as any))
            listeners.add(fn); return add.call(this, type, fn, options); };
        EventTarget.prototype.removeEventListener = function (type, fn, options) { listeners.delete(fn); return remove.call(this, type, fn, options); };
        const RO = window.ResizeObserver;
        window.ResizeObserver = class extends RO {
            constructor(callback: any) { super(callback); observers.add(this); }
            disconnect() { observers.delete(this); super.disconnect(); }
        };
        let created = 0, closed = 0, starts = 0;
        w.AudioContext = class {
            currentTime = 0;
            destination = {};
            constructor() { created++; }
            async resume() { }
            async suspend() { }
            async close() { closed++; }
            createOscillator() { return { type: '', frequency: { value: 0 }, connect() { }, disconnect() { }, start() { starts++; }, stop() { } }; }
            createGain() { return { gain: { setValueAtTime() { }, exponentialRampToValueAtTime() { } }, connect() { }, disconnect() { } }; }
        };
        w.newAuditHost = () => { w.auditHost = new ArcadeGameHost({ container: root, load: async () => runtime, options: { storage: null } }); return w.auditHost.open(); };
        w.audit = () => ({ intervals: intervals.size, listeners: listeners.size, observers: observers.size, created, closed, starts });
    });
    for (let i = 0; i < 12; i++) {
        await page.evaluate(() => (window as any).newAuditHost());
        await expect(page.locator('#audit-root .fb-device')).toHaveCount(1);
        expect(await page.evaluate(() => (window as any).audit())).toMatchObject({ intervals: 1, listeners: 7, observers: 1 });
        await page.locator('#audit-root .fb-button-b').click();
        await page.evaluate(() => (window as any).auditHost.pause());
        expect(await page.evaluate(() => (window as any).audit().intervals)).toBe(0);
        const starts = await page.evaluate(() => (window as any).audit().starts);
        await page.clock.runFor(1000);
        expect(await page.evaluate(() => (window as any).audit().starts)).toBe(starts);
        await page.evaluate(() => (window as any).auditHost.resume());
        await page.clock.runFor(1000);
        await page.evaluate(() => { const host = (window as any).auditHost; host.close(); host.close(); });
        expect(await page.evaluate(() => (window as any).audit())).toMatchObject({ intervals: 0, listeners: 0, observers: 0, created: i + 1, closed: i + 1 });
        await expect(page.locator('#audit-root')).toBeEmpty();
    }
});
