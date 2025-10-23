#!/bin/bash
name=$(basename $0)
db_password="000600"

if [ "$name" = "setup_database.sh" -o "$name" = "run.sh" ]; then
  # ensure mysql is installed
  if ! [ -x "$(command -v mysql)" ]; then
    echo 'Error: mysql is not installed.' >&2
    exit 1
  fi
  # ensure mysql is running
  if ! systemctl is-active --quiet mysql; then
    sudo systemctl start mysql
  fi
  # ensure MainDB database exists
  mysql -u alfacpm -p"$db_password" -e "
    CREATE DATABASE IF NOT EXISTS MainDB;
    USE MainDB;
    CREATE TABLE IF NOT EXISTS Projects_Table (
      Project_ID INT AUTO_INCREMENT,
      Project_Name VARCHAR(255) NOT NULL,
      Project_Description TEXT,
      PRIMARY KEY (Project_ID)
    );"
  
  # ensure Projects_Table table exists
  if ! mysql -u alfacpm -p"$db_password" -e "USE MainDB; SHOW TABLES LIKE 'Projects_Table';" | grep -q Projects_Table; then
    mysql -u alfacpm -p"$db_password" MainDB < ../backend/API/project_db_setup.sql
  fi
  echo "Database setup completed successfully."
  # Exit if the script is run as setup_database.sh
  if [ "$name" = "setup_database.sh" ]; then
    exit 0
  fi
fi

if [ "$name" = "run_frontend.sh" -o "$name" = "run.sh" ]; then
  # check if node is installed
  if ! [ -x "$(command -v node)" ]; then
    echo 'Error: node is not installed.' >&2
    exit 1
  fi

  # check if npm is installed
  if ! [ -x "$(command -v npm)" ]; then
    echo 'Error: npm is not installed.' >&2
    exit 1
  fi

  # check if frontend dependencies are installed
  if [ ! -f "../frontend/node_modules/.bin/webpack" ]; then
    (cd ../frontend && npm install)
  fi

  # check if frontend is running if not start it
  if ! pgrep -f "npm start --prefix ../frontend" > /dev/null; then
    (cd ../frontend && npm start) &
  fi
  echo "Frontend is running."
  # if [ "$name" = "run_frontend.sh" ]; then
  #   exit 0
  # fi
fi

if [ "$name" = "run_backend.sh" -o "$name" = "run.sh" ]; then
  # check if python3 is installed
  if ! [ -x "$(command -v python3)" ]; then
    echo 'Error: python3 is not installed.' >&2
    exit 1
  fi

  # check if pip3 is installed
  if ! [ -x "$(command -v pip3)" ]; then
    echo 'Error: pip3 is not installed.' >&2
    exit 1
  fi

  # check if Django is installed
  if ! python3 -c "import django" &> /dev/null; then
    echo 'Error: Django is not installed.' >&2
    exit 1
  fi

  # check if backend is running if not start it
  if ! pgrep -f "python3 ./manage.py runserver 0.0.0.0:8000" > /dev/null; then
    (cd ../backend && python3 ./manage.py runserver 0.0.0.0:8000) &
  fi
  echo "Backend is running."
  # if [ "$name" = "run_backend.sh" ]; then
  #   exit 0
  # fi
fi

# if the script is run as run.sh, it will wait for all background processes to finish
# and then exit
echo "All services are running. Press Ctrl+C to stop."
trap "echo 'Stopping services...'; jobs=$(jobs -p); [ -n \"$jobs\" ] && kill $jobs; exit" SIGINT SIGTERM
wait
echo "All services have been stopped."
