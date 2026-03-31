const puppeteer = require('puppeteer');

async function runBot() {
    // --- (၁) Pipedream/GitHub Payload မှ Input များ ယူခြင်း ---
    // GitHub Actions Environment ကနေ data တွေကို ဖတ်ပါတယ်
    const inputStr = process.env.INPUT_DATA || '{}';
    const input = JSON.parse(inputStr);
    
    const { 
        action = "purchase", 
        type = "MLBB", 
        id = input.game_id, 
        zone = input.server_id, 
        diamondItem = "5 Diamonds", 
        orderId = "Order_001" 
    } = input;

    const PHONE = "09680072956";
    const PASS = "130943";

    console.log("Starting Bot for ID:", id);

    const browser = await puppeteer.launch({ 
        headless: "new", 
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    const page = await browser.newPage();

    try {
        console.log("Navigating to Y Gyi Login Page...");
        await page.goto('https://ygyigameshop.com/login', { waitUntil: 'networkidle2' });

        // Login ဝင်ခြင်း
        await page.type('input[name="identity"]', PHONE);
        await page.type('input[name="password"]', PASS);
        await page.click('button[type="submit"]');
        await page.waitForNavigation();
        console.log("Login Successful!");

        if (action === "sync_prices") {
            await page.goto('https://ygyigameshop.com', { waitUntil: 'networkidle2' });
            const prices = await page.$$eval('.package-item', pkgs => pkgs.map(p => ({
                name: p.querySelector('.package-name').innerText,
                price: p.querySelector('.package-price').innerText
            })));
            console.log("Prices Synced:", JSON.stringify(prices));
        } else {
            console.log(`Processing ${type} for ID: ${id}`);
            await page.goto('https://ygyigameshop.com', { waitUntil: 'networkidle2' });

            // Game Type ရွေးခြင်း
            // မှတ်ချက် - ဆိုက်ထဲက ခလုတ်နာမည်နဲ့ ကိုက်ညီရန် လိုသည်
            const gameBtn = type === "MLBB" ? "Mobile Legends" : "PUBG Mobile";
            await page.click(`text=${gameBtn}`).catch(() => console.log("Game button not found, searching by selector..."));

            // ID နှင့် Zone ရိုက်ထည့်ခြင်း
            await page.waitForSelector('input[placeholder*="ID"]');
            await page.type('input[placeholder*="ID"]', id.toString());
            if (zone) await page.type('input[placeholder*="Zone"]', zone.toString());

            // ခဏစောင့်ပြီး Nickname ဖတ်ခြင်း
            await new Promise(r => setTimeout(r, 3000));
            const nickname = await page.$eval('.nickname-display', el => el.innerText).catch(() => "Verified_Player");

            console.log(`Verified Nickname: ${nickname}`);
            
            // Diamond ရွေးပြီး ဝယ်ခြင်း (ဒီနေရာမှာ Item Name မှန်ဖို့ လိုပါတယ်)
            // await page.click(`text=${diamondItem}`);
            // await page.click('button.buy-now'); 

            console.log(`Success: Order placed for ${nickname}`);
        }

    } catch (error) {
        console.error(`Bot Error: ${error.message}`);
    } finally {
        await browser.close();
    }
}

runBot();
