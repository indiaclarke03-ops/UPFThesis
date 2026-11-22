#!/bin/sh
# Lighthouse audit of the production build (desktop + mobile) for the main routes.
# Usage: npm run build:site && npx vite preview --port 4173 &  then  sh scripts/lighthouse.sh
BASE=${BASE:-http://localhost:4173/}
CHROME_PATH=${CHROME_PATH:-$(ls -d "$HOME"/Library/Caches/ms-playwright/chromium-*/chrome-mac*/*.app/Contents/MacOS/* 2>/dev/null | head -1)}
export CHROME_PATH
OUT=${OUT:-lighthouse-reports}
mkdir -p "$OUT"
for form in desktop mobile; do
  for r in "" explore methods scenarios country/TUR; do
    name=$(echo "${r:-story}" | tr '/' '-')
    flag=""; [ "$form" = desktop ] && flag="--preset=desktop"
    npx lighthouse "${BASE}#/$r" $flag --quiet --chrome-flags="--headless=new" \
      --only-categories=performance,accessibility,best-practices,seo \
      --output=json --output=html --output-path="$OUT/$form-$name" >/dev/null 2>&1
    node -e "const r=require('./$OUT/$form-$name.report.json');const c=r.categories;console.log('$form'.padEnd(8),'$name'.padEnd(12),Object.values(c).map(v=>v.title.slice(0,4)+' '+Math.round(v.score*100)).join('  '),' LCP',r.audits['largest-contentful-paint'].displayValue,' TBT',r.audits['total-blocking-time'].displayValue,' CLS',r.audits['cumulative-layout-shift'].displayValue)"
  done
done
