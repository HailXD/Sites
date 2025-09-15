set /p MYVAR="Enter Commit: "
git pull
node script.js
git add .
git commit -m "%MYVAR%"
git push