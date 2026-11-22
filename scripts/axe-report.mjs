import { chromium } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
const b = await chromium.launch(); const ctx = await b.newContext({viewport:{width:1440,height:900}}); const p = await ctx.newPage()
for (const r of (process.argv[2]??'#/').split(',')) {
  await p.goto('http://localhost:4173/'+r); await p.waitForLoadState('networkidle'); await p.waitForTimeout(800)
  const res = await new AxeBuilder({ page: p }).analyze()
  for (const v of res.violations.filter(v=>['serious','critical'].includes(v.impact))) {
    console.log(r, v.id, v.impact, v.nodes.length); for (const n of v.nodes.slice(0,4)) console.log('   ', n.target.join(' '), '|', (n.failureSummary||'').split('\n')[1]?.slice(0,140))
  }
}
await b.close()
