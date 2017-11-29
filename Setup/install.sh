#!/bin/sh

##########################################################################
# Yet Another Monitor (YAMon)
# Copyright (c) 2013-present Al Caughey
# All rights reserved.
#
# Script to download, install & setup YAMon3.x
#
#   Updated: 2016-06-13 - fail over to wget if curl does not work in yget()
#   Updated: 2016-10-05 - updated for 3.1.0
#   Updated: 2016-10-16 - updated for 3.1.1... now defensively checking YAMon2 files existence
#   Updated: 2017-01-15 - added [then removed] option to download via http or https
#   Updated: 2017-01-31 - big cleanup in setup3.x.sh, fixed issues in script, etc.
#   Updated: 2017-03-21 - run compare.sh before setup.
#
##########################################################################

yget(){
	local dst="$1"
	local src="$2"
	#echo "yget: $src --> $dst"
	if [ ! -z "$bHasCurl" ] ; then
		curl -sk --max-time 15 -o "$dst" --header "Pragma: no-cache" --header "Cache-Control: no-cache" -A YAMon-Setup "$src"
		if [ ! -f "$dst" ] ; then
			echo "	 --> download failed?!? with curl... Trying again with wget"
			wget "$src" -qO "$dst"
		fi
	else
		#echo "wget $src" -qO "$dst"
		wget "$src" -qO "$dst"
		if [ ! -f "$dst" ] ; then
			echo "	 --> download failed?!? Trying again"
			wget "$src" -qO "$dst"
		fi
	fi
}

[ -x /usr/bin/clear ] && bCanClear=1
[ -x /usr/bin/curl ] && bHasCurl=1

YAMON='/opt/YAMon3/'
directory='current'
[ ! -z "$1" ] && directory="$1"

echo "
**************************************
   Welcome to the YAMon installer

   Please report any issues to
	  install@usage-monitoring.com
**************************************
 "
echo "Would you like to install YAMon on your router?"
tries=0
readstr="Either
	- hit <enter> or \`y\` for yes, or \`n\` for no: "
while true; do
	read -p "$readstr" resp

	if [ -z "$resp" ] || [ "$resp" == 'y' ] || [ "$resp" == 'Y' ] ; then
		break
	elif [ "$resp" == 'n' ] || [ "$resp" == 'N' ] ; then
		echo "
*** Cancelling installation...  Hopefully you'll try again!
Please send questions to install@usage-monitoring.com.

"
		exit 0
	else
		readstr="
	Only \`y\` or \`n\` are permitted!
	Please try again: "
	fi
	tries=$(($tries + 1))
	if [ "$tries" -eq "3" ] ; then
		echo "
*** Strike three... you're out!
Please check the installation requirements and try again.
"
		exit 0
	fi
done

baseurl='http://usage-monitoring.com'

echo "

**************************************
* Your files will be installed from \`$baseurl\`...
**************************************

Please specify the fully qualified path to your
installation directory - e.g., \`$YAMON\`.
"
tries=0
readstr="	Either
	- hit <enter> to accept \`$YAMON\`, or
	- type your preferred installation location: "
while true; do
	read -p "$readstr" resp
	[ -z "$resp" ] && [ -d "$YAMON" ] && break
	[ -z "$resp" ] && [ ! -d "$YAMON" ] && mkdir -p "$YAMON" && break

	YAMON="$resp"
	ig=$(echo "$YAMON" | grep '^/.*/$')
	#echo "ig --> $ig ($regex)"
	if [ -z "$ig" ] ; then
		readstr="
	The installation path must be fully qualified - i.e., start & end with \`/\`!
	Please try again: "
	else
		mkdir -p "$YAMON"
		[ -d "$YAMON" ] && break
		readstr="
	The installation directory could not be created...
	Please try again : "
	fi
	tries=$(($tries + 1))
	if [ "$tries" -eq "3" ] ; then
		echo "
*** Strike three... you're out!
Please check the installation requirements and try again.
"
		exit 0
	fi
done

echo "
**************************************
Installing YAMon...
"

umversion="/tmp/yamonsetup.txt"
yget "$umversion" "$baseurl/$directory/YAMon3/Setup/gfmd3.2.php"
if [ ! -f "$umversion" ] ; then
	echo "
Installation Failed!... \`$umversion\` was not created...
the router likely does not have internet access.
Please check your settings and try again.
"
	exit 0
fi

rm $umversion

chmod +x "$YAMON"
[ -d "${YAMON}data" ] && chmod -R 666 "${YAMON}data"
sleep 1

_enableLogging=1
_log2file=1
_loglevel=0

[ ! -d "${YAMON}includes" ] && mkdir -p "${YAMON}includes"
getlatest="${YAMON}includes/getlatest.sh"
yget "$getlatest" "$baseurl/$directory/YAMon3/Setup/includes/getlatest3.2.html"
source "$getlatest"

yn_y="Options: \`0\` / \`n\` ==> No -or- \`1\` / \`y\` ==> Yes(*)"
yn_n="Options: \`0\` / \`n\` ==> No(*) -or- \`1\` / \`y\` ==> Yes"
zo_r=^[01nNyY]$
t_cp=0

param='verify'
source "${YAMON}compare.sh"
sleep 5

[ ! -d "${YAMON}data" ] && [ -d '/opt/YAMon2/' ] && prompt 't_cp' "A \`/opt/YAMon2/\` directory exists.\n  Would you like to copy your config.file and data files to \`${YAMON}\`?" "$yn_y" '1' $zo_r

if [ "$t_cp" -eq "1" ] ; then
	[ ! -d "${YAMON}data" ] && mkdir -p "${YAMON}data"
	[ -d '/opt/YAMon2/data' ] && $(cp -a "/opt/YAMon2/data" "${YAMON}") || echo "  *** no /data "
	[ -f '/opt/YAMon2/Setup/config.file' ] && $(cp -a "/opt/YAMon2/Setup/config.file" "${YAMON}") || echo "  *** no config.file"

	echo "



	Running setup...



	"
	[ ! -z "$bCanClear" ] && clear
	source "${YAMON}setup.sh"
elif [ -f "${YAMON}config.file" ] ; then
	prompt 't_c' "\`config.file\` already exists in \`$YAMON\`. \n  Do you want to run \`setup.sh\` (again) to update \`config.file\`?" "$yn_y" 1 $zo_r
	if [ "$t_c" == 1 ] ; then
		echo "



	Running setup...



		"

		[ ! -z "$bCanClear" ] && clear
		source "${YAMON}setup.sh"
	else
		prompt 't_e' "Do you want to launch YAMon now?" "$yn_y" '1' $zo_r
		if [ "$t_e" == 1 ] ; then
			chmod +x "${YAMON}restart.sh"
			chmod +x "${YAMON}shutdown.sh"
			chmod +x "${YAMON}startup.sh"
			chmod +x "${YAMON}yamon$_version.sh"
			[ ! -z "$bCanClear" ] && clear
			${YAMON}restart.sh
		else
			echo "
****************************************************************

YAMon$_version is now configured and ready to run.

To launch YAMon, enter \`${YAMON}startup.sh\`.

Send questions to questions@usage-monitoring.com

Thank you for installing YAMon.  You can show your appreciation and support
future development by donating at http://usage-monitoring.com/donations.php.

	Al

"
		fi
	fi
else
	echo "



	Running setup...



		"
	[ ! -z "$bCanClear" ] && clear
	source "${YAMON}setup.sh"
fi
