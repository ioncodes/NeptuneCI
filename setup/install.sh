#!/bin/bash
# Installs the supported environments and dependencies

apt-get update
apt-get install -y mono-complete
apt-get install -y qtcreator
apt-get install -y curl
curl -sL https://deb.nodesource.com/setup_7.x | sudo -E bash -
apt-get install -y nodejs
apt-get install -y mysql-server
echo 'dependencies installed :)'
echo 'preparing sql stuff..'
mysql -u user -p < db.sql
echo 'apply user & password to /settings/sql.json!'
echo 'bye :*'