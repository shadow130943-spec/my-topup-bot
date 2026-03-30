import asyncio
from playwright.async_api import async_playwright

# Config
BASE_URL = "https://ygyigameshop.com"
PHONE = "09680072956"
PASS = "130943"

async def smart_action(page, command):
    """
    AI API Key မလိုဘဲ Website ထဲက element တွေကို လိုက်ရှာပြီး အလုပ်လုပ်ပေးမည့် logic
    """
    print(f"Bot Brain Processing Command: {command}")
    
    # ၁။ Website ထဲမှာ command နဲ့ ပတ်သက်တဲ့ စာသား ရှိ၊ မရှိ ရှာမယ်
    # ဥပမာ- 'Server Check' လို့ ခိုင်းရင် 'Server' ပါတဲ့ ခလုတ်ကို ရှာနှိပ်မယ်
    try:
        # စာသားနဲ့ တိုက်ရိုက်ရှာပြီး နှိပ်ခိုင်းခြင်း
        elements = await page.query_selector_all("button, a, input, span")
        for el in elements:
            text = await el.inner_text()
            if command.lower() in text.lower():
                await el.click()
                print(f"Action Executed: Clicked on '{text}'")
                return True
        
        # ၂။ အကယ်၍ စာသားနဲ့ ရှာမရရင် ID သို့မဟုတ် Name နဲ့ ထပ်ရှာမယ်
        await page.click(f"[id*='{command}'], [name*='{command}'], [class*='{command}']")
        return True
    except Exception:
        print(f"Smart Action Failed for: {command}")
        return False

async def process_order(order_id, user_id, order_data):
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()

        try:
            # 1. Login
            await page.goto(f"{BASE_URL}/login")
            await page.fill('input[type="tel"]', PHONE) # ဖုန်းနံပါတ်နေရာ
            await page.fill('input[type="password"]', PASS) # Password နေရာ
            await page.click("button[type='submit']")
            await page.wait_for_load_state("networkidle")

            # 2. Parallel & Smart Execution
            # API ကနေ 'server check' လို့ ခိုင်းလာရင်
            if "command" in order_data:
                await smart_action(page, order_data["command"])
            
            # 3. Weekly Pass Logic (Qty > 1 ဖြစ်ရင် တစ်ပြိုင်တည်းလုပ်ဖို့ main က ခိုင်းလိမ့်မယ်)
            if order_data.get("item") == "Weekly Pass":
                await page.goto(f"{BASE_URL}/product/weekly-pass")
                await page.fill("#player_id", order_data["player_id"])
                await page.click("#buy_button")
                print(f"Order {order_id} Success!")

            return {"status": "success", "order_id": order_id}

        except Exception as e:
            # Auto-Refund Logic Trigger
            print(f"Order {order_id} Failed. Triggering Refund for User {user_id}")
            return {"status": "failed", "order_id": order_id}
        finally:
            await browser.close()

async def main(incoming_orders):
    # Parallel Execution: အော်ဒါအားလုံးကို တစ်ပြိုင်တည်း ၁၀ စက္ကန့်အတွင်း အပြီးလုပ်မည်
    tasks = [process_order(o['id'], o['user_id'], o['data']) for o in incoming_orders]
    results = await asyncio.gather(*tasks)
    
    # Consolidated Notification
    success = [r for r in results if r['status'] == 'success']
    print(f"Finished: {len(success)} Success, {len(results)-len(success)} Failed.")

# စမ်းသပ်ရန် Data
mock_api_call = [
    {'id': 1, 'user_id': 'U001', 'data': {'player_id': '112233', 'item': 'Weekly Pass'}},
    {'id': 2, 'user_id': 'U002', 'data': {'command': 'server status'}} # Code ထဲမပါတာ ခိုင်းကြည့်ခြင်း
]

if __name__ == "__main__":
    asyncio.run(main(mock_api_call))
          
