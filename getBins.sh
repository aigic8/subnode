#!/bin/env bash

###############################################
# NOTE 1: This bash script is only for linux64
# NOTE 2: You should have 'wget' and 'unzip' installed for this script to work
###############################################

# Exit the script if a command fails
set -e

rm -rf ./bin
mkdir ./bin

## AMASS ######################################
wget https://github.com/owasp-amass/amass/releases/download/v3.23.3/amass_Linux_amd64.zip
unzip ./amass_Linux_amd64.zip 
mv ./amass_Linux_amd64/amass ./bin
chmod +x ./bin/amass
rm -rf ./amass_Linux_amd64 ./amass_Linux_amd64.zip

## FINDOMAIN ##################################
wget https://github.com/Findomain/Findomain/releases/download/9.0.0/findomain-linux.zip
unzip ./findomain-linux.zip
mv ./findomain ./bin
chmod +x ./bin/findomain
rm findomain-linux.zip

## SUBFINDER ##################################
wget https://github.com/projectdiscovery/subfinder/releases/download/v2.6.0/subfinder_2.6.0_linux_amd64.zip
unzip subfinder_2.6.0_linux_amd64.zip
mv ./subfinder ./bin
chmod +x ./bin/subfinder
rm subfinder_2.6.0_linux_amd64.zip

## HTTPX ######################################
wget https://github.com/projectdiscovery/httpx/releases/download/v1.3.3/httpx_1.3.3_linux_amd64.zip
unzip -n httpx_1.3.3_linux_amd64.zip
mv ./httpx ./bin
chmod +x ./bin/httpx
rm LICENSE.md httpx_1.3.3_linux_amd64.zip

## DNSX #######################################
wget https://github.com/projectdiscovery/dnsx/releases/download/v1.1.4/dnsx_1.1.4_linux_amd64.zip
unzip -n dnsx_1.1.4_linux_amd64.zip
mv ./dnsx ./bin
chmod +x ./bin/dnsx
rm LICENSE.md dnsx_1.1.4_linux_amd64.zip
