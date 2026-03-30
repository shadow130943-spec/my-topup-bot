const { Actor } = require('apify');
const puppeteer = require('puppeteer');

Actor.main(async () => {
    const input = await Actor.getInput() || {};
    const { action = "purchase", type = "MLBB", id, zone, diamondItem, orderId } = input;

    // --- (၁) သင်ပေးထားသော Acc Info များ ---
    const PHONE = "09680072956";
    const PASS = "130943";

    const browser = await puppeteer.launch({ 
        headless: true, // မျက်နှာပြင်မပါဘဲ နောက်ကွယ်က အလုပ်လုပ်မည်
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    const page = await browser.newPage();

    try {
        Actor.log.info("Navigating to Y Gyi Login Page...");
        await page.goto('https://ygyigameshop.com/login', { waitUntil: 'networkidle2' });

        // --- (၂) Login ဝင်ခြင်း (ခလုတ်များ ရှာနှိပ်ခြင်း) ---
        await page.type('input[name="identity"]', PHONE); // ဖုန်းနံပါတ်ရိုက်ထည့်သည့်နေရာ
        await page.type('input[name="password"]', PASS);   // Password ရိုက်ထည့်သည့်နေရာ
        await page.click('button[type="submit"]');         // Login ခလုတ်ကို နှိပ်ခြင်း
        await page.waitForNavigation();
        Actor.log.info("Login Successful!");

        if (action === "sync_prices") {
            // --- (၃) ဈေးနှုန်းစစ်ဆေးခြင်း Logic ---
            await page.goto('https://ygyigameshop.com', { waitUntil: 'networkidle2' });
            // ဒီနေရာမှာ ဆိုက်ထဲက ဈေးနှုန်းတွေကို Bot က လိုက်ရှာဖတ်ပါမယ်
            const prices = await page.$$eval('.package-item', pkgs => pkgs.map(p => ({
                name: p.querySelector('.package-name').innerText,
                price: parseInt(p.querySelector('.package-price').innerText.replace(/[^\d]/g, ''))
            })));
            await Actor.pushData({ status: "success", data: prices, markup: 1.05 });

        } else {
            // --- (၄) တကယ်ဝယ်ယူခြင်း Logic ---
            Actor.log.info(`Going to buy ${type} for ${id}`);
            await page.goto('https://ygyigameshop.com', { waitUntil: 'networkidle2' });

            // ဂိမ်းအမျိုးအစားအလိုက် ခလုတ်ကို ရှာနှိပ်ခြင်း
            const gameBtn = type === "MLBB" ? "Mobile Legends" : "PUBG Mobile";
            await page.click(`text=${gameBtn}`); 

            // ID နှင့် Zone ရိုက်ထည့်ခြင်း
            await page.waitForSelector('input[placeholder*="ID"]');
            await page.type('input[placeholder*="ID"]', id);
            if (zone) await page.type('input[placeholder*="Zone"]', zone);

            // Nickname ကို Bot က ဖတ်ခြင်း
            await page.waitForTimeout(2000); // ဖြည့်ပြီးရင် Nickname ပေါ်လာအောင် ခဏစောင့်
            const nickname = await page.$eval('.nickname-display', el => el.innerText).catch(() => "Verified_Player");

            // Diamond Item (Package) ကို ရှာနှိပ်ခြင်း
            await page.click(`text=${diamondItem}`);

            // 'ဝယ်မည်' ခလုတ်ကို နှိပ်ခြင်း
            await page.click('button.buy-now'); 

            Actor.log.info(`Order placed for ${nickname}`);
            await Actor.pushData({ status: "success", nickname, game: type, orderId });
          }

    } catch (error) {
        Actor.log.error(`Bot Error: ${error.message}`);
        await Actor.pushData({ status: "failed", message: error.message, orderId });
    } finally {
        await browser.close();
    }
});
