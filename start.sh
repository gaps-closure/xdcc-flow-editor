#!/bin/bash

json=$1

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
	cd $(dirname $0)
	npm start
)
