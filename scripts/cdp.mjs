// Tiny CDP driver for checking pages in the headless Chrome on :9222.
//   node scripts/cdp.mjs <url> <width> <height> <steps.json>
// steps: [{wait: ms}, {eval: "js", print: "label"}, {move: [x,y]}, {click: [x,y]}, {shot: "file.png", clip?: {x,y,width,height}, full?: true, scale?: n}]
// script: [{eval: "js"}, {wait: ms}, {shot: "file.png"}, {move:[x,y]}, ...]
// env: CDP_NOJS=1 loads the page with JavaScript disabled; CDP_REDUCED=1 emulates
// prefers-reduced-motion: reduce. The tab is brought to the front, so it is not
// "hidden" and animation frames and visibility-gated timers run.
import { writeFileSync, readFileSync } from 'node:fs'
const [,, url, w, h, stepsFile] = process.argv
const steps = JSON.parse(readFileSync(stepsFile, 'utf8'))
// Each run gets its own tab, so several people can check pages at once.
const page = await (await fetch('http://localhost:9222/json/new?about:blank', { method: 'PUT' })).json()
const ws = new WebSocket(page.webSocketDebuggerUrl)
let id = 0; const pending = new Map(); const logs = []
ws.addEventListener('message', ev => { const m = JSON.parse(ev.data)
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) }
  if (m.method === 'Runtime.exceptionThrown') logs.push('EXC ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text).split('\n')[0])
  if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') logs.push('log ' + m.params.entry.text.slice(0, 200) + (m.params.entry.url ? ' ' + m.params.entry.url : ''))
  if (m.method === 'Runtime.consoleAPICalled' && ['error','warning'].includes(m.params.type)) logs.push(m.params.type + ' ' + m.params.args.map(a => a.value ?? a.description ?? '').join(' ').slice(0, 300))
})
const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) })
await new Promise(r => ws.addEventListener('open', r))
await send('Runtime.enable'); await send('Page.enable'); await send('Log.enable'); await send('Page.bringToFront')
if (process.env.CDP_NOJS) await send('Emulation.setScriptExecutionDisabled', { value: true })
if (process.env.CDP_REDUCED) await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
 await send('Network.enable'); await send('Network.setCacheDisabled', { cacheDisabled: true })
await send('Emulation.setDeviceMetricsOverride', { width: +w, height: +h, deviceScaleFactor: 2, mobile: +w < 500 })
await send('Page.navigate', { url }); await new Promise(r => setTimeout(r, 2500))
for (const s of steps) {
  if (s.wait) await new Promise(r => setTimeout(r, s.wait))
  if (s.eval) { const r = await send('Runtime.evaluate', { expression: s.eval, awaitPromise: true, returnByValue: true }); if (s.print) console.log(s.print, r.error ? 'CDP ERROR ' + r.error.message : r.result.exceptionDetails ? 'EXC ' + (r.result.exceptionDetails.exception?.description ?? r.result.exceptionDetails.text).split('\n')[0] : JSON.stringify(r.result.result.value)) }
  if (s.move) await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: s.move[0], y: s.move[1] })
  if (s.click) { for (const t of ['mousePressed','mouseReleased']) await send('Input.dispatchMouseEvent', { type: t, x: s.click[0], y: s.click[1], button: 'left', clickCount: 1 }) }
  if (s.shot) { let clip = s.clip
    // {shot, full: true}: the whole document, beyond the viewport.
    if (s.full) { const r = await send('Runtime.evaluate', { expression: '[document.documentElement.scrollWidth, document.documentElement.scrollHeight]', returnByValue: true }); const [fw, fh] = r.result.result.value; clip = { x: 0, y: 0, width: fw, height: fh } }
    const r = await send('Page.captureScreenshot', { format: 'png', ...(clip ? { clip: { ...clip, scale: s.scale ?? 1 }, captureBeyondViewport: !!s.full } : {}) }); writeFileSync(s.shot, Buffer.from(r.result.data, 'base64')) }
}
console.log('LOGS:', logs.length ? '\n' + logs.join('\n') : 'none')
ws.close()
await fetch('http://localhost:9222/json/close/' + page.id)
