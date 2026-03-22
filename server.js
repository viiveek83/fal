const http = require('http');
const fs = require('fs');
const path = require('path');
const mockupsDir = path.join(__dirname, 'docs', 'superpowers', 'specs', 'mockups');
const server = http.createServer((req, res) => {
  // Serve specific files by path, default to dashboard
  let file = '01-dashboard.html';
  const url = req.url.replace(/^\//, '');
  if (url && url.endsWith('.html')) file = url;
  else if (url === 'lineup') file = '02-lineup.html';
  else if (url === 'leaderboard') file = '03-leaderboard.html';
  else if (url === 'admin') file = '04-league-admin.html';
  else if (url === 'players') file = '05-players.html';
  else if (url === 'scores') file = '06-match-scores.html';
  else if (url === 'standings') file = '07-full-standings.html';
  else if (url === 'view-lineup') file = '08-view-lineup.html';
  const filePath = path.join(mockupsDir, file);
  try {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(fs.readFileSync(filePath));
  } catch (e) {
    res.writeHead(404);
    res.end('Not found: ' + file + '\nAvailable: /lineup /leaderboard /admin /players /scores /standings /view-lineup');
  }
});
server.listen(64472, () => console.log('Serving mockups on http://localhost:64472\nRoutes: / /lineup /leaderboard /admin /players /scores /standings /view-lineup'));
