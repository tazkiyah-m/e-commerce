const fs = require('fs');
const path = require('path');

const appDir = path.join(__dirname, 'app');
const userDashboardDir = path.join(appDir, '(user-dashboard)');

try {
  if (!fs.existsSync(userDashboardDir)) {
    fs.mkdirSync(userDashboardDir, { recursive: true });
  }

  const moves = [
    { from: '(user)/menu', to: '(user-dashboard)/menu' },
    { from: '(user)/orders', to: '(user-dashboard)/orders' },
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

  console.log("Done moving.");
} catch (e) {
  console.error("Error: ", e);
}
