#!/bin/bash
#usage ./start.sh [-d] [xdcc.json]
#
# -d - debug mode
# xdcc.json - input json file

json=$1
debug="false"
cleschema="/opt/closure/schemas/cle-schema.json"

if [ "$json" == "-d" ]
then
	debug="true"
	json=$2
fi

if [ "$json" == "" ]
then
	echo missing json using "xdcc/xdcc.json"
	mkdir -p xdcc
	json="xdcc/xdcc.json"
fi

json="$PWD/$json"

echo "Running using $json"
(
	echo $json > param.inputfile
	echo $debug > param.debugmode
	echo $cleschema > param.cleschema
	cd $(dirname $0)
	npm start
)
