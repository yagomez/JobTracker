# Why localhost might not load

Common causes and what to try.

---

## 1. **Wrong URL or port**

- Use **http://127.0.0.1:3001** (not `https://`, not `localhost`, not port 3000).
- After starting the dev server, wait until the terminal shows **"✓ Ready"** before opening the browser.

---

## 2. **IPv6 vs IPv4 (very common on Mac)**

On macOS, **localhost** can resolve to **::1** (IPv6) while the dev server listens on **127.0.0.1** (IPv4). The browser then talks to the wrong address and you get a blank page or "connection refused".

**Fix:** Always open **http://127.0.0.1:3001** (IPv4) in the browser. The dev script is set to bind to `127.0.0.1` so server and browser match.

---

## 3. **Dev server not running**

- In the project folder, run: `npm run dev`
- Leave that terminal open; closing it or pressing Ctrl+C stops the server.
- In another terminal you can check: `lsof -i :3001` — you should see a `node` process. If not, the server isn’t running.

---

## 4. **Stale build or cache**

- Stop the dev server (Ctrl+C).
- Delete the build folder and restart:
  - `npm run dev:clean`
  - Or: `rm -rf .next` then `npm run dev`
- In the browser: hard refresh (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows) or try a **private/incognito** window.

---

## 5. **Firewall or security software**

- Temporarily turn off the Mac firewall (System Settings → Network → Firewall) or any third‑party security app and test again.
- If it works with the firewall off, add an rule to allow Node or your terminal app.

---

## 6. **Another app using the port**

- Check what’s on the port: `lsof -i :3001`
- If it’s not your Node dev server, either close that app or use a different port, e.g. `npm run dev:8080` and open **http://127.0.0.1:8080**.

---

## 7. **Different browser**

- Try Chrome, Firefox, or Safari in case one browser is blocking or misbehaving.

---

## 8. **Server crashes before sending the page**

- Watch the terminal where `npm run dev` is running. When you open http://127.0.0.1:3001, see if any **red error messages** or stack traces appear.
- If the process exits, something in the app or environment is crashing the server; those errors are the next thing to fix.

---

## Quick checklist

1. Run `npm run dev` and wait for "✓ Ready".
2. Open **http://127.0.0.1:3001** (not localhost, not 3000).
3. Hard refresh or use a private window.
4. If it still fails, run `npm run dev:clean` and try again.
5. Try another browser and, if needed, temporarily disable firewall/antivirus.
