const fs = require('fs');
const path = require('path');

const appDir = path.join(__dirname, 'app');
const userDir = path.join(appDir, '(user)');

try {
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true });
  }

  const moves = [
    { from: '(public)/page.tsx', to: '(user)/page.tsx' },
    { from: '(public)/layout.tsx', to: '(user)/layout.tsx' },
    { from: '(dashboard)/menu', to: '(user)/menu' },
    { from: '(dashboard)/orders', to: '(user)/orders' },
    { from: '(public)/checkout', to: '(user)/checkout' },
    { from: 'about', to: '(user)/about' },
    { from: 'auth', to: '(user)/auth' },
    { from: 'contact', to: '(user)/contact' },
    { from: 'location', to: '(user)/location' },
  ];

  for (const move of moves) {
    const src = path.join(appDir, move.from);
    const dest = path.join(appDir, move.to);
    
    if (fs.existsSync(src)) {
      if (!fs.existsSync(path.dirname(dest))) {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
      }
      fs.renameSync(src, dest);
      console.log(`Moved ${src} to ${dest}`);
    } else {
      console.log(`Source not found: ${src}`);
    }
  }

  // Cleanup old empty folders
  const toClean = ['(public)', '(dashboard)', 'menu', 'checkout'];
  for (const c of toClean) {
    const p = path.join(appDir, c);
    if (fs.existsSync(p)) {
      fs.rmSync(p, { recursive: true, force: true });
      console.log(`Removed ${p}`);
    }
  }

  console.log("Done!");
} catch (e) {
  console.error("Error: ", e);
}
