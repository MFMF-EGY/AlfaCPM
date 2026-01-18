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
  check_installed mariadb
  check_installed node
  check_installed npm
  check_installed python3
  check_installed pytest
  check_installed tmux
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

# Ensure mariadb is running.
echo "Running MariaDB service..."
if ! systemctl is-active --quiet mariadb; then
  sudo systemctl start mariadb
fi
if ! systemctl is-active --quiet mariadb; then
  echo "Failed to start MariaDB service." >&2
  exit 1
fi
echo "MariaDB service is running."
echo "Setting up database..."
# Ensure alfacpm user exists and has all privileges.
mariadb -u $db_user -p"$db_password" -e "
  CREATE USER IF NOT EXISTS '$db_user'@'localhost' IDENTIFIED BY '$db_password';
  GRANT ALL PRIVILEGES ON *.* TO '$db_user'@'localhost' WITH GRANT OPTION;
  FLUSH PRIVILEGES;"
# Ensure MainDB database exists.
mariadb -u $db_user -p"$db_password" -e "
  CREATE DATABASE IF NOT EXISTS MainDB;
  USE MainDB;
  CREATE TABLE IF NOT EXISTS Projects_Table (
    Project_ID INT AUTO_INCREMENT,
    Project_Name VARCHAR(255) NOT NULL,
    Project_Description TEXT,
    PRIMARY KEY (Project_ID)
  );"
echo "Database setup completed successfully."

# If session 'alfacpm' exists, ask to kill it.
if tmux has-session -t alfacpm 2>/dev/null; then
  read -p "Tmux session 'alfacpm' already exists. Do you want to kill it? (y/n): " choice
  case "$choice" in
    y|Y ) tmux kill-session -t alfacpm;;
    n ) echo "Exiting script."; exit 0;;
    * ) echo "Invalid choice. Exiting script."; exit 1;;
  esac
fi
tmux new-session -d -s alfacpm
# Enable mouse support in tmux.
tmux set -g mouse on
# Split the tmux window into two panes.
tmux split-window -h -t alfacpm
# Start the backend and frontend services in tmux panes.
tmux send-keys -t alfacpm:0.0 "echo 'Starting backend server...' && python3 ../backend/manage.py runserver 0.0.0.0:8000" Enter
tmux send-keys -t alfacpm:0.1 "echo 'Starting frontend server...' && cd ../frontend && npm run dev" Enter
tmux attach -t alfacpm

# TODO: Uncomment the following lines and add option to run them as services.
# # Start the Django backend server in tmux.
# python3 ../backend/manage.py runserver 0.0.0.0:8000&
# # Start the Node.js frontend server in the background.
# echo "Starting frontend service..."
# npm --prefix ../frontend start&

# # if the script is run as run.sh, it will wait for all background processes to finish
# # and then exit
# echo "Running all services. Press Ctrl+C to stop."
# trap 'echo "Stopping services..."; pids=$(jobs -p); if [ -n "$pids" ]; then kill -- $pids 2>/dev/null || kill -9 -- $pids 2>/dev/null; fi; exit' SIGINT SIGTERM
# wait
# echo "All services have been stopped."
