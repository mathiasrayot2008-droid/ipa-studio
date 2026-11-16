import asyncio, json, os, sys
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--proxy-server=http://127.0.0.1:42131","--proxy-bypass-list=127.0.0.1;localhost"])
        pg = await b.new_page()
        pg.on("console", lambda m: print("CONSOLE:", m.text[:400], flush=True) if True else None)
        await pg.goto("http://127.0.0.1:8765/index.html")
        for i in range(240):
            await asyncio.sleep(1)
            r = await pg.evaluate("window.results")
            if r and r.get("done"): break
        print(json.dumps(await pg.evaluate("window.results"), indent=1, ensure_ascii=False)[:5000])
        # page réactive ?
        print("eval ok:", await pg.evaluate("1+1"))
        await b.close()
asyncio.run(main())
