set /p MYVAR="Commit Message: "
git pull
node script.js
git add .
git commit -m "%MYVAR%"
git push