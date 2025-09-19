set /p MYVAR="Commit Message: "
node browser/script.js
git pull
git add .
git commit -m "%MYVAR%"
git push
