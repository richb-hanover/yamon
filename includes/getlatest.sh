##########################################################################
# Yet Another Monitor (YAMon)
# Copyright (c) 2013-present Al Caughey
# All rights reserved.
#
# Script to download the latest files from usage-monitoring.com
#
#   Updated: 2016-06-13 - fail over to wget if curl does not work in getlatest()
#   Updated: 2016-06-19 - fixed previous changes
#   Updated: 2016-11-04 - added wd.sh
#   Updated: 2016-12-30 - added purge.sh
#
##########################################################################

getlatest()
{
	local path=$1
	spath="${path/.sh/.html}"
	local src="http://www.usage-monitoring.com/$directory/YAMon3/Setup/${spath}"
	local dst="${YAMON}${path}"
	local rm="$3"
	
	echo "  * $dst"
	if [ -z "$rm" ] && [ -x /usr/bin/curl ] ; then
		curl -sk --max-time 15 -o "$dst" --header "Pragma: no-cache" --header "Cache-Control: no-cache" -A "YAMon-Setup" "$src"
		rm='wget'
	else
		wget "$src" -U "YAMon-Setup" -qO "$dst"
		rm=''
	fi
	if [ ! -f "$dst" ] ; then
		[ "$err_num" -gt 5 ] && echo "
****************************
*** Download failed $err_num times?!? Do you have an internet connection?
*** Exiting the install process
*** Send questions to install@usage-monitoring.com
****************************" && exit 0;
		err_num=$((err_num+1))
		echo "--> download failed?!? Trying $rm"
		getlatest "$1" $2 "$rm"
		return
	fi
	[ ! -z "$2" ] && source "$dst"
	err_num=0
}
err_num=0

echo "
Downloading the latest version of:"
getlatest 'includes/versions.sh' 1
getlatest 'default_config.file'
getlatest "includes/util$_version.sh" 1
getlatest 'includes/defaults.sh' 1
getlatest 'includes/getLocalCopies.sh'
getlatest 'includes/hourly2monthly.sh'
getlatest "readme.txt"
getlatest "yamon$_version.sh"
getlatest 'startup.sh'
getlatest 'shutdown.sh'
getlatest 'restart.sh'
getlatest 'h2m.sh'
getlatest 'glc.sh'
getlatest 'wd.sh'
getlatest 'purge.sh'
getlatest 'organize.sh'
getlatest 'compare.sh'

if [ "$_version" > "3.2.1" ] ; then
	getlatest "setup$_version.sh"
	[ -f "${YAMON}setup.sh" ] && rm "${YAMON}setup.sh"
	ln -s "${YAMON}setup$_version.sh" "${YAMON}setup.sh"
	chmod +x "${YAMON}setup$_version.sh"
else
	getlatest "setup.sh"
fi

[ ! -d "${YAMON}strings/$_lang" ] && mkdir -p "${YAMON}strings/$_lang"
getlatest "strings/$_lang/strings.sh" 1

[ ! -d "${YAMON}www" ] && mkdir -p "${YAMON}www"
[ ! -d "${YAMON}www/js" ] && mkdir -p "${YAMON}www/js"
[ ! -d "${YAMON}www/css" ] && mkdir -p "${YAMON}www/css"
[ ! -d "${YAMON}www/images" ] && mkdir -p "${YAMON}www/images"
getlatest "www/yamon$_file_version.html"
getlatest "www/css/custom.css"