git pull
python update_projects.py
git add .
set /p MYVAR="Enter Commit: "
git commit -m "%MYVAR%"
git push