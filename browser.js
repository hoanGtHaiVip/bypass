const puppeteer = require('puppeteer-extra');
const pluginProxy = require('puppeteer-extra-plugin-proxy');
const { Cluster } = require('puppeteer-cluster');
const fs = require('fs');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const UserPreferencesPlugin = require('puppeteer-extra-plugin-user-preferences');

const proxyList = fs.readFileSync('http.txt', 'utf8').split('\n').map((proxy) => proxy.trim());

const userPrefs = {
  'webrtc.ip_handling_policy': 'default_public_interface_only',
  'webrtc.multiple_routes_enabled': false,
  'privacy.trackingProtection.enabled': true,
};

(async () => {
  const cluster = await Cluster.launch({
    concurrency: Cluster.CONCURRENCY_CONTEXT,
    maxConcurrency: 5, // Số lượng worker chạy đồng thời
    puppeteerOptions: {
      args: ['--no-sandbox',
             '--disable-setuid-sandbox',
             '--disable-dev-shm-usage',
             '--disable-accelerated-2d-canvas',
             '--no-first-run',
             '--no-zygote',
             '--disable-gpu'
        ],
    },
  });

  await cluster.task(async ({ page, data }) => {
    // Cấu hình proxy
    puppeteer.use(pluginProxy({ proxyUrl: data }));

    // Giả mạo User-Agent để tránh Cloudflare phát hiện và yêu cầu xác thực bổ sung
    puppeteer.use(StealthPlugin());

    // Cấu hình user preferences để giảm mức độ bảo mật của trang web
    puppeteer.use(UserPreferencesPlugin({ userPrefs }));

    await page.goto('https://famy.lol/?zxcr9999');
    const title = await page.title();
    console.log(`[Cundi Browser] Proxy: ${data} | Title:`, title);
  });

  // Lặp lại các proxy trong danh sách và gửi cho worker
  for (let i = 0; i < 100; i++) {
    for (let j = 0; j < proxyList.length; j++) {
      cluster.queue(proxyList[j]);
    }
  }

  // Chờ tất cả các worker kết thúc
  await cluster.idle();
  await cluster.close();
})();
