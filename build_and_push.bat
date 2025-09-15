set /p MYVAR="Enter Commit: "
git pull
python update_projects.py
git add .
git commit -m "%MYVAR%"
git push