import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

test('includes the requested trust and payment content', () => {
  assert.match(html, /Insured and Licensed/);
  assert.match(html, /Payments Accepted/);

  for (const method of ['zelle', 'applepay', 'venmo', 'cashapp', 'visa', 'mastercard']) {
    assert.match(html, new RegExp(`assets/payments/${method}\\.svg`));
  }
});

test('uses bedroom-based residential pricing throughout the site', () => {
  assert.match(html, /Standard Turnover — Studio–2BR — \$175/);
  assert.match(html, /Premier Turnover — 3BR — \$265/);
  assert.match(html, /Elite Turnover — 4BR — \$365/);
  assert.match(html, /5BR\+ — Request Custom Quote/);
  assert.match(html, /name="bedroomCount"/);
  assert.doesNotMatch(html, /sq ft|squareFeet|Office Cleaning — Starting at \$150/);
});

test('routes office estimates to the booking form and includes Rockdale County', () => {
  assert.match(html, /Request Free Estimate/);
  assert.match(html, /selectPackage\('Office Cleaning — Request Free Estimate'\)/);
  assert.match(html, /Rockdale County/);
});
