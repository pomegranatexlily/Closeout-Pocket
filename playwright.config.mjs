import {defineConfig,devices} from '@playwright/test';
export default defineConfig({
 testDir:'./tests',testMatch:'browser.spec.mjs',timeout:45000,
 expect:{timeout:10000},fullyParallel:false,retries:process.env.CI?1:0,
 reporter:process.env.CI?'github':'list',
 use:{baseURL:'http://127.0.0.1:4173/Closeout-Pocket/',trace:'retain-on-failure',screenshot:'only-on-failure'},
 projects:[
  {name:'chromium-mobile',use:{...devices['Pixel 7'],browserName:'chromium'}},
  {name:'webkit-iphone',use:{...devices['iPhone 13'],browserName:'webkit'}}
 ],
 webServer:{command:'node tests/serve.cjs',url:'http://127.0.0.1:4173/Closeout-Pocket/',timeout:30000,reuseExistingServer:!process.env.CI}
});
