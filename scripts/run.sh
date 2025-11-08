#!/bin/bash
name=$(basename $0)
db_user="alfacpm"
db_password="000600"
exit_code=0

check_installed() {
  if ! [ -x "$(command -v $1)" ]; then
    echo " $1 is not installed." >&2
    exit_code=1
  else
    echo " $1 is installed."
  fi
}

check_installed_python_package() {
  if ! python3 -c "import $1" &> /dev/null; then
    echo " Python package $1 is not installed." >&2
    exit_code=1
  else
    echo " Python package $1 is installed."
  fi
}

check_dependencies() {
  check_installed mysql
  check_installed node
  check_installed npm
  check_installed python3
  if [ $exit_code -eq 0 ]; then
    check_installed_python_package django
  fi
}

echo "Checking dependencies..."
check_dependencies
if [ $exit_code -ne 0 ]; then
  echo "Please install the missing dependencies and try again."
  exit $exit_code
fi
echo "All dependencies are installed."

# Ensure mysql is running.
echo "Running MySQL service..."
if ! systemctl is-active --quiet mysql; then
  sudo systemctl start mysql
fi
if ! systemctl is-active --quiet mysql; then
  echo "Failed to start MySQL service." >&2
  exit 1
fi
echo "MySQL service is running."
echo "Setting up database..."
# Ensure MainDB database exists.
mysql -u $db_user -p"$db_password" -e "
  CREATE DATABASE IF NOT EXISTS MainDB;
  USE MainDB;
  CREATE TABLE IF NOT EXISTS Projects_Table (
    Project_ID INT AUTO_INCREMENT,
    Project_Name VARCHAR(255) NOT NULL,
    Project_Description TEXT,
    PRIMARY KEY (Project_ID)
  );"

echo "Database setup completed successfully."
echo "Starting backend service..."
# Start the Django backend server in the background.
python3 ../backend/manage.py runserver&
# Start the Node.js frontend server in the background.
echo "Starting frontend service..."
npm --prefix ../frontend start&

# if the script is run as run.sh, it will wait for all background processes to finish
# and then exit
echo "Running all services. Press Ctrl+C to stop."
trap 'echo "Stopping services..."; pids=$(jobs -p); if [ -n "$pids" ]; then kill -- $pids 2>/dev/null || kill -9 -- $pids 2>/dev/null; fi; exit' SIGINT SIGTERM
wait
echo "All services have been stopped."
