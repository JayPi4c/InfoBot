gnome-terminal -- bash -c "cd server/; node index.js 2>&1 | tee log.txt"
gnome-terminal -- bash -c "cd bot/; node bot.js 2>&1 | tee log.txt"
