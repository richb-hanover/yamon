"use strict"
/*
##########################################################################
# Yet Another Monitor (YAMon)                      #
# Copyright (c) 2013-2016 Al Caughey                   #
# All rights reserved.                           #
# See `yamon3.x.js` for more T&C's                     #
##########################################################################
*/
Object.getPrototypeOf(localStorage).find=function(s) {
  var r=[]
  Object.keys(localStorage).forEach(function(k){
    if (k.indexOf(s)==-1) return
    r.push({'key':k,'value':localStorage.getItem(k)});
  });
  return r.sort(function(a,b) { return (a.key < b.key?1:(a.key > b.key?-1:0)); });
}
$.fn.textWidth = function () {
  var _t = $(this),txt = _t.html();
  if (_t[0].nodeName == 'INPUT') txt = _t.val();
  var ns = $('<span/>').attr('id', 't-twwe').html(txt).css({'font-size': _t.css('font-size'),'font-family': _t.css('font-family')})
  ns.appendTo('body')
  var width = $('#t-twwe').width() + 5;
  $('#t-twwe').remove();
  return width;
};

function loadSettings(){
  var deferred = $.Deferred()
  g_Settings=JSON.parse(localStorage.getItem('YAMon3-Settings'))||{}
  if(!g_Settings['complete']){
    g_Settings=JSON.parse(localStorage.getItem('Settings'))||{}
  }
  if(!g_Settings['devices']) g_Settings['devices']={}
  if(!g_Settings['isp']) g_Settings['isp']={}
  showLoading('Loading Settings...')
  if(typeof(_dbkey)=='undefined'){
    $('#dbkey-clicked,#dbkey,#sv-btn,#p-useHTTPS,#p-autoSave,#acses-tab').hide()
    deferred.resolve()
  }
  else{
    $('#acses-tab').show()
    $('#dbkey').val(_dbkey)
    $('#settings-tab').addClass('db')
    showLoading('Loading Settings from database...')
    var request=$.ajax({
      url: domain+"db/loSettings.php",
      type: "POST",
      data: {db:_dbkey},
      dataType: "json"
    });
    request.done(function( data ) {
      if (data.response=='success') {
        g_Settings=(data.results.values=='')?{}: JSON.parse(data.results.values)
        $('#getKey,#dbkey-needtoclick,#dbkey-clicked').remove()
        $('#dbkey-sharing').show()
      }
      else if (data.response=='error') {
        alert( data.comment );
        g_Settings=JSON.parse(localStorage.getItem('YAMon3-Settings'))||{}
      }
    });
    request.fail(function( jqXHR,textStatus ) {
      if(confirm("Loading your settings from the database failed with error message: " + textStatus +":  " +  errorThrown +"?!?\n\nClick `OK` to try again or `Cancel`")){
        setTimeout(function(){loadSettings()},1500)
      }
      deferred.resolve()
    });
    request.complete(function( jqXHR,textStatus ) {
      if(!g_Settings['devices']) g_Settings['devices']={}
      if(!g_Settings['isp']) g_Settings['isp']={}
      if(!g_Settings.check4Updates) g_Settings.check4Updates=$('#check4Updates').val()
      g_IPs=JSON.parse(localStorage.getItem('IPs'))||g_Settings['IPs']||{}
      delete g_Settings.IPs
      delete g_Settings['settings_pswd']
      delete g_Settings['settings_pswd_clear']
      deferred.resolve()
    });
  }
  return deferred.promise()
}
function checkConfig(){
  var now='0x'+(((Date.now()/1000).toFixed(0))*1).toString(16)
  if(!g_Settings['complete']==1) return false
  if ((g_Settings.check4Updates!='n') && (g_Settings.nextCheck<now)) checkFiles()
  if ((!g_Settings.fnd) || (g_Settings.fnd<now)) nudge()
  if ((g_Settings['isp-reminders']!='n') && (g_Settings['isp-ncd']<now)) getMessage('isp reminder', g_Settings['isp-lcd'])
  if(!_settings_pswd || _settings_pswd=='') return
  if(_settings_pswd!=localStorage['settings_pswd']){
    $('#d-settings_pswd').show().siblings().hide()
  }
}
function twod(v){
  return ('0'+Number(v)).slice(-2)
}
function updateLSStorage(){
  var tis=localStorage.find('v2summary')
  if(!g_Settings['summaries']) g_Settings['summaries']={}
  Object.keys(tis).forEach(function(k){
    var ws=tis[k].key.replace('v2summary-',''),wv=tis[k].value
    g_Settings['summaries'][ws]=wv
    localStorage.removeItem(tis[k].key)
  })
  var tis=localStorage.find('isp-')
  if(!g_Settings['isp']) g_Settings['isp']={}
  Object.keys(tis).forEach(function(k){
    var ws=tis[k].key.replace('isp-',''),wv=tis[k].value
    g_Settings['isp'][ws]=wv
    localStorage.removeItem(tis[k].key)
  })
  var tis=localStorage.find('bd_graphs')
  if(!g_Settings['graphs']) g_Settings['graphs']={}
  Object.keys(tis).forEach(function(k){
    var ws=tis[k].key.replace('graphs',''),wv=tis[k].value
    g_Settings['isp'][ws]=wv
    localStorage.removeItem(tis[k].key)
  })
}
function setSettingsDefaults(){
  if(g_Settings['complete']==1) updateLSStorage()

  var bw_cap=g_Settings['bw_cap']
  if(bw_cap==null){
  }
  else if(bw_cap==''){
    $('#bandwidth-u').prop('checked','checked')
    $('#spUsageCap').text('Unlimited').removeClass('GBytes')
  }
  else{
    $('#bandwidth-l').prop('checked','checked')
    $('#spUsageCap').text(bw_cap).addClass('GBytes')
    $('#bw_cap').val(bw_cap)
  }
  if(_unlimited_usage=='1'){
    var bonus_cap=g_Settings['bonus_cap']
    if(bonus_cap==null){
    }
    else if(bonus_cap==''){
      $('#bonusdata-u').prop('checked','checked')
    }
    else{
      $('#bonusdata-l').prop('checked','checked')
      $('#bonus_cap').val(bonus_cap)
    }
  }
  $('#DisplayUnits').attr('id', 'displayUnits').attr('name', 'displayUnits')
  $('#displayUnits').val(g_Settings['displayUnits']||g_Settings['DisplayUnits']||'auto');
  var du=$("#displayUnits").val()
  $('.change-units a')[du=='Auto'?'first':'last']().removeClass('hidden')
  $('.change-units a').click(function(){
    changeUnits(this)
  })
  $("#sp-freeMem").text(0)
  $('.table-units[data-displayUnits="' + du + '"]').addClass('sel')
  $('#NumDecimals').val(g_Settings['NumDecimals']||'1');
  _dec=$("#NumDecimals").val();
  $('#ShowZeroes').prop('checked',g_Settings['ShowZeroes'])
  $('#SuppressUpdates').prop('checked',g_Settings['SuppressUpdates'])
  $('#ShowDevices').prop('checked',g_Settings['ShowDevices'])
  $('#ShowHiddenDevices').prop('checked',g_Settings['ShowHiddenDevices']||false)
  updateSettings('showLive',(g_Settings['showLive']||_doLiveUpdates)==1)
  $('#showLive').prop('checked',g_Settings['showLive'])
  $('#showISP').prop('checked',g_Settings['showISP'])
  $('.nad').text($('#ShowZeroes').is(':checked')?'Hide Zeroes':'Show All')
  $('.dshd').text($('#ShowHiddenDevices').is(':checked')?'Hide Hidden Devices':'Show Hidden Devices')
  $('.u-d').addClass($('#ShowDevices').is(':checked')?'c-d':'c-u')
  $('#cb-dl-o').prop('checked',(g_Settings['cb-dl-o']))
  $('#showLive,#showISP').each(function(){
    $('.'+$(this).attr('id'))[$(this).is(':checked')?'removeClass':'addClass']('hidden')
  })
  $('#RefreshInterval').val(g_Settings['RefreshInterval']||'120')
  $('#settings_pswd').val(g_Settings['settings_pswd_clear']||'')
  $('.RefreshInterval').text($('#RefreshInterval').val());
  if(typeof(_updatefreq)=='undefined'){
    ShowAlert("<p>`_updatefreq` has no value!</p><p>This could be because your <a href='js/config.js' target='_blank'>config.js</a>` wasn't created or is not stored the in expected location or it could be due to a logic error that was found in early versions of YAMon 2.2.  Please confirm that `config.js` exists and/or <a href='http://www.dd-wrt.com/phpBB2/viewtopic.php?t=259806' target='_blank'>upgrade to the latest version of the script</a>.</p>",'updatefreq-error')
    _updatefreq=30
  }
  $('#updatefreq').val(g_Settings['updatefreq']||_updatefreq);
  $('._updatefreq').text(_updatefreq)
  $('#isp-url').val(g_Settings['isp-url']);
  $('#isp-lcd').text(g_Settings['isp-lcd']||'Never');
  $('#isp-reminders').val(g_Settings['isp-reminders']||'n');
  $('#isp-url').val()!='' && $('.isp-url').prop('href',$('#isp-url').val()).show();
  $('#dateFMT').val(g_Settings['dateFMT']||1);
  $('#dateSep').val(g_Settings['dateSep']||' ');
  $('#check4Updates').val(g_Settings['check4Updates']||'n');
  g_Settings.check4Updates=$('#check4Updates').val()
  $('#useHTTPS').prop('checked',g_Settings['useHTTPS']||false);
  $('#autoSave').prop('checked',g_Settings['autoSave']||false);
  $('#dbkey-clicked,#dbkey,#sv-btn,#p-useHTTPS,#p-autoSave')[typeof(_dbkey)=='undefined'?'hide':'show']()
  $('#show-local').prop('checked',g_Settings['show-local']||false);
  $('.show-local')[$('#show-local').is(':checked')?'show':'hide']()
  $('#act-dest').text($('#show-local').is(':checked')?'All Destinations':'External Destinations Only')
  $('#acc-filter-ip').val(g_Settings['acc-filter-ip']||document.domain);
  $('#hmUpdateRows').val(g_Settings['hmUpdateRows']||10);
  $('#hmUpdateRows').change(function(){
    var id=$(this).attr('id')
    g_Settings[id]=$(this).val()
    saveSettings(false)
  })
  $('#devOrCurr').prop('checked', localStorage.getItem('devOrCurr')=='dev')
  $('.v-info')[localStorage.getItem('devOrCurr')=='dev'?'addClass':'removeClass']('isDev')
  $('#devOrCurr').change(function(){
    localStorage.setItem('devOrCurr', $(this).is(':checked')?'dev':'')
    $('.v-info')[localStorage.getItem('devOrCurr')=='dev'?'addClass':'removeClass']('isDev')
  })
  $('#ajaxCache').prop('checked', localStorage.getItem('ajaxCache')=='true')
  $('#ajaxCache').change(function(){
    localStorage.setItem('ajaxCache', $(this).is(':checked'))
    $.ajaxSetup({'cache':$(this).is(':checked')})
  })
   $('.clear-filter').click(function(){
    $('.filterIP').text('')
    $('.filter').removeClass('filter')
    activeConnections()
  })
  $('#DailyFooter,#MonthlyFooter,#devicesFooter').addClass('ftotals');
  $('.tab-div').addClass('hidden')
  var ul_redtot=g_Settings['ul-redtot']||false
  $('#ul-redtot').prop('checked',ul_redtot||ul_redtot=='true')
  $('.th-tot').html('Totals' +(_unlimited_usage=='0'?'':(' ('+($('#ul-redtot').is(':checked')?'less':'including') + ' Bonus Data)')))
  $('.isUL')[_unlimited_usage=='1'?'show':'hide']()
  $('.required').parents('p').each(function(){
    if($(this).attr('id')==undefined)return
    var id=$(this).attr('id').split('-')[1]
    if(g_Settings[id]==undefined){
      $(this).append("<span class='mval check' title='Click to accept this value'>&#x2714;</span>")
      $('#'+id).addClass('mval')
    }
  })
  if(_unlimited_usage==1) {
    $('#bd-start').text(_unlimited_start)
    $('#bd-end').text(_unlimited_end)
  }
  $('.mval.check').click(function(){
    var id=$(this).parents('p').attr('id').split('-')[1], cv=$("#"+id).val()
    if(id=='bw_cap'&&g_nobwCap){
    }
    else if(id=='bw_cap'&&!g_nobwCap&&(cv==undefined||cv==''||isNaN(cv)||cv<0)){
      alert("Sorry this field must contain a positive number!")
      $('#'.id).focus()
      return false
    }
    else if(id=='bonus_cap'&& $('#bonusdata-l').is(':checked')&&(cv==undefined||cv==''||isNaN(cv)||cv<0)){
      alert("Sorry this field must contain a positive number!")
      $('#'.id).focus()
      return false
    }
    updateSettings(id,$('#'+id).val())
    $(this).parents('p').find('.mval').removeClass('mval')
    $(this).remove()
  })
  if(_doLiveUpdates==1){
    if (!google||!google.visualization||!google.visualization.DataTable){
      console.log('Error - google.visualization.DataTable')
      return false
    }
    s_usage=new google.visualization.DataTable();
    s_usage.addColumn('string','Time');
    s_usage.addColumn('number','1-min');
    s_usage.addColumn('number','5-min');
    s_usage.addColumn('number','15-min');
    livekbs_do=new google.visualization.DataTable();
    livekbs_do.addColumn('string','Time');
    livekbs_do.addColumn('number','downloads');
    livekbs_do.addColumn('number','ave. downloads');
    livekbs_up=new google.visualization.DataTable();
    livekbs_up.addColumn('string','Time');
    livekbs_up.addColumn('number','uploads')
    livekbs_up.addColumn('number','ave. uploads');
  }
  $('#ShowRD').prop('checked',g_Settings['ShowRD']);
  $('#active-connections')[_doCurrConnections==1?'show':'hide']()
  $('.ddp').removeClass('sel')
  $('#'+(g_Settings['is-isp-ddp']||'isp_details')).addClass('sel')
  $('#'+(g_Settings['is-rd-ddp']||'rd_details')).addClass('sel')
  $('#isp-format').val(g_Settings['isp-format']||'0').change();
  $('.isp-name').text($('#isp-format option:selected').text()||'Your ISP');
  $('#settings-isp table').hide()
  $('#isp-'+$('#isp-format').val()).show()
  $( "#edit-device" ).draggable({handle:"p.ed-title",cursor:"move",cancel:'.btn'});
  $( "#settings" ).draggable({cursor:"move",cancel:"textarea,.btn", stop:function(){
      $(this).css({'height':'auto'})
    }
  });
  if(!g_Settings['graphs']){
    g_Settings['graphs']={}
    set_bd_graphs()
  }
  var bd_graphs=g_Settings['graphs']
  Object.keys(bd_graphs).forEach(function(k){
    $('#'+k).prop('checked',bd_graphs[k])
  })
  $('#no-graphs')[$('.gr-cb:checked').length==0?'addClass':'removeClass']('disabled-btn')
  $('#all-graphs')[$('.gr-cb').length==$('.gr-cb:checked').length?'addClass':'removeClass']('disabled-btn')
  $('#ed-update').addClass('not-sel')
  $('.header.AM').unbind('click').click(function(){
    $('.AM').hide()
    $('.PM').fadeIn('slow')
  })
  $('.header.PM').unbind('click').click(function(){
    $('.PM').hide()
    $('.AM').fadeIn('slow')
  })
}
function setGlobals(){
  g_base=1024
  g_toKB=Math.pow(g_base,1)
  g_toMB=Math.pow(g_base,2)
  g_toGB=Math.pow(g_base,3)
  g_nobwCap=$('#bandwidth-u').is(':checked')
}
function setButtonsActions(){
  $('#tabs-w .settings-tab').click(function(){
    if($(this).hasClass('selected')) return
    var cvs=$(this).attr('id'),cs=$('#'+cvs+'-section')
    if(cvs=='alert-tab')return false
    $(this).addClass('selected').siblings('.settings-tab').removeClass('selected')
    if($(this).hasClass('loaded')){
      cs.siblings('.tab-div').slideUp('fast')
      cs.fadeIn('slow')
      return
    }
    //if(cvs!='daily-tab')loadView(false)
    loadView(false)
  })
  $("#settings_pswd").change(function(){
    var tv=$(this).val(),tv5=$.md5(tv)
    if($('#settings_pswd_cb').is(':checked')) localStorage.setItem('settings_pswd',tv5)
    $('.bad_value').removeClass('bad_value')
    if(_settings_pswd==tv5){
      if($('#settings_pswd_cb').is(':checked')){
        localStorage.setItem('settings_pswd',tv5)
      }
      $('#d-settings_pswd').slideUp('slow').siblings().slideDown('slow')
      $('.intro').hide()
      $('#settings').hide()
    }
    else{
      $("#settings_pswd").addClass('bad_value').focus().select()
      $("#settings_pswd").parents('label').addClass('bad_value')
    }
  });
  $("#settings_pswd_cb").change(function(){
    var tv=$("#settings_pswd").val(),tv5=$.md5(tv)
    if($('#settings_pswd_cb').is(':checked')){
      localStorage.setItem('settings_pswd',tv5)
    }
    else{
      localStorage.removeItem('settings_pswd')
    }
  });
  $(".linked").change(function(e){
    var tid=$(this).attr('id'),tv=$(this).val()
    if(tv==undefined||tv==''||isNaN(tv)){
      alert("Sorry this field cannot be empty and must be a number!")
      $('#'.tid).focus()
      e.stopPropagation()
      return false
    }
    $('.'+tid).html(tv)
    updateSettings(tid,tv)
  });
  $('input[name=bandwidth]').change(function(){
    g_nobwCap=$('#bandwidth-u').is(':checked')
    $('.is-cap')[g_nobwCap?'hide':'show']()
    if(g_nobwCap){
      $('#bw_cap').addClass('disabled');
      updateSettings('bw_cap','')
      $('#spUsageCap').text('Unlimited').removeClass('GBytes')
    }
    else{
      $('#bw_cap').focus()
      updateSettings('bw_cap',$('#bw_cap').val())
    }
    setSummaryTotals()
  })
  $('input[name=bonusdata]').change(function(){

    if($('#bonusdata-u').is(':checked')){
      $('#bonus_cap').addClass('disabled');
      updateSettings('bonus_cap','')
    }
    else{
      $('#bonus_cap').focus()
      updateSettings('bonus_cap',$('#bonus_cap').val())
    }
  })
  $('#bw_cap').focus(function(){
    $(this).removeClass('disabled')
    $('#bandwidth-l').prop('checked','checked')
    $('#bandwidth-u').prop('checked','')
    g_nobwCap=$('#bandwidth-u').is(':checked')
  })
  $('#bw_cap').change(function(){
    var band_cap=$(this).val()
    if(!g_nobwCap&&isNaN(band_cap)||band_cap<=0){
      alert('The bandwidth allowance must be a positive number!\n\nPlease try again.')
      $(this).addClass('badvalue').focus()
      return false
    }
    else{
      $('#spUsageCap').text(band_cap).addClass('GBytes')
      updateSettings('bw_cap',band_cap)
    }
    $('.is-cap')[g_nobwCap?'hide':'show']()
    $('.badvalue').change(function(){
      $(this).removeClass('badvalue')
    })
    setSummaryTotals()
  })
  $('#bonus_cap').focus(function(){
    $(this).removeClass('disabled')
    $('#bonusdata-l').prop('checked','checked')
    $('#bonusdata-u').prop('checked','')
  })
  $('#bonus_cap').change(function(){
    var bonus_cap=$(this).val()
    if(isNaN(bonus_cap)||bonus_cap<=0){
      alert('The bandwidth allowance must be a positive number!\n\nPlease try again.')
      $(this).addClass('badvalue').focus()
      return false
    }
    else{
      updateSettings('bonus_cap',bonus_cap)
    }
    $('.badvalue').change(function(){
      $(this).removeClass('badvalue')
    })
    //setSummaryTotals()
  })
  $('#cb-dl-o').change(function(){
    updateSettings('cb-dl-o',$(this).is(':checked'))
    setSummaryTotals()
  })
   $('#NumDecimals,#displayUnits').change(function(){
    var tid=$(this).attr('id')
    updateSettings(tid,$(this).val())
    var du=$("#displayUnits").val()
    $('.table-units.sel').removeClass('sel')
    $('.table-units[data-displayUnits="' + du + '"]').addClass('sel')
    _dec=$("#NumDecimals").val()||2
    displayBytes('#main-body')
  })
  $("#isp-url").change(function(){
    var tv=$(this).val()
    $('.isp-url')[tv==''?'fadeOut':'fadeIn']('slow').prop('href',tv)
    updateSettings('isp-url',tv)
  })
  $(".u-d").click(function(){
    $('#ShowDevices').click()
  })
  $("#ShowDevices").change(function(){
    updateSettings('ShowDevices',$(this).is(':checked'))
    showHideDevices()
  })
  $("#ShowHiddenDevices").change(function(){
    updateSettings('ShowHiddenDevices',$(this).is(':checked'))
    $('#devices-tab').removeClass('loaded')
    $('.dshd').text($('#ShowHiddenDevices').is(':checked')?'Hide Hidden Devices':'Show Hidden Devices')
  })
  $("#ShowRD").change(function(){
    var tv=$(this).is(':checked')
    updateSettings('ShowRD',tv)
    $('#RouterFooter,#DiffFooter,#PercentFooter,.is-rd')[tv?'show':'hide']()
    var un=$('#mb-filter').val()
    $('.gr-nall')[un=='ALL'&&($('#showISP').is(':checked')||tv)?'show':'hide']()
    DrawHourlyGraph()
    drawGraphs()
  })
  $("#ShowZeroes").change(function(){
    var tv=$(this).is(':checked')
    updateSettings('ShowZeroes',tv)
    $('.nad').text(tv?'Hide Zeroes':'Show All')
    showHideDevices()
  })
  $("#SuppressUpdates").change(function(){
    var tv=$(this).is(':checked')
    updateSettings('SuppressUpdates',tv)
  })
  $('#ul-redtot').change(function(){
    updateSettings('ul-redtot',$('#ul-redtot').is(':checked'))
    $('.th-tot').html('Totals' +(_unlimited_usage=='0'?'':(' ('+($('#ul-redtot').is(':checked')?'less':'including') + ' Bonus Data)')))
    changeTotals('Daily')
    changeTotals('Monthly')
    setDevices()
    setSummaryTotals()
  })
  $('.edit-restrictions input, .edit-restrictions select').change(function(){
    $('.edit-restrictions .rest-save').fadeIn('slow')
  })
  $('#useHTTPS,#autoSave').change(function(){
    updateSettings($(this).attr('id'),$(this).is(':checked'))
  })
  $('#showISP').change(function(){
    var isChecked=$(this).is(':checked')
    $('.showISP,.is-isp')[isChecked?'removeClass':'addClass']('hidden')
    updateSettings('showISP',isChecked)
    var un=$('#mb-filter').val()
    $('.gr-nall')[un=='ALL'&&(isChecked||$('#ShowRD').is(':checked'))?'show':'hide']()
    $('#monthly-breakdown-tab').removeClass('loaded')
    drawGraphs()
  })
  $('#enable-lu')[g_Settings['showLive']?'hide':'show']()
  $('#enable-lu').siblings()[g_Settings['showLive']?'show':'hide']()
  $('#d-isp-d, #d-isp-u').change(function(){
    $('#monthly-breakdown-tab').removeClass('loaded')
    $(this).removeClass('badvalue')
    if(isNaN($(this).val())){
      $(this).addClass('badvalue')
      $(this).select()
      return false
    }
    var isp_d=$('#d-isp-d').val()*g_toMB,isp_u=$('#d-isp-u').val()*g_toMB,isp_tot=isp_d+isp_u,dt=$('#DailyFooter .tByts').data('value')
    $('#daily-isp-row .tByts').data('value',isp_tot)
    $('.d-isp-d').data('value',isp_d)
    $('.d-isp-u').data('value',isp_u)
    $('#daily-isp-row .percent ').text(((isp_tot-dt)/dt*100).toFixed(_dec))
    displayBytes('#daily-isp-row')
    var cd=_cr_Date.getDate(),mo=twod(_rs_Date.getMonth()+1),yr=_rs_Date.getFullYear()
    if(!g_Settings['isp']){
      g_Settings['isp']={}
    }
    if(!g_Settings['isp'][mo+'-'+yr]){
      g_Settings['isp'][mo+'-'+yr]={}
    }
    else{
      var isp_totals=JSON.parse(g_Settings['isp'][mo+'-'+yr])
    }
    if((isp_d==''||isp_d==0)&&(isp_u==''||isp_u==0)){
      delete isp_totals[cd]
    }
    else{
      isp_totals[cd]={down:isp_d,up:isp_u}
    }
    g_Settings['isp'][mo+'-'+yr]=JSON.stringify(isp_totals)
    saveSettings()
  })
  $('#cf-desc, #cf-d, #cf-u').change(function(){
    var is_desc=$(this).attr('id')=='cf-desc'
    $('.badvalue').removeClass('badvalue')
    if(is_desc){}
    else if(isNaN($(this).val())){
      $(this).addClass('badvalue')
      alert('This value must be a number!')
      $(this).select()
      return false
    }
    $('#monthly-tab,#monthly-breakdown-tab').removeClass('loaded')
    var desc=$('#cf-desc').val()
    var tdu=$('#cf-u').val(),tdd=$('#cf-d').val()
    var cd=_cr_Date.getDate()
    var da=twod(_rs_Date.getDate())
    var mo=twod(_rs_Date.getMonth()+1)
    var yr=_rs_Date.getFullYear()
    var ds=yr+'-'+mo+'-'+da
    if(!g_Settings['corrections']){
      g_Settings['corrections']={}
    }
    if(!g_Settings['corrections'][mo+'-'+yr]||!g_Settings['corrections'][mo+'-'+yr].length){
      g_Settings['corrections'][mo+'-'+yr]={}
      corrections={}
    }
    else{
      corrections=JSON.parse(g_Settings['corrections'][mo+'-'+yr])
    }
    var dcvd=(tdd-(corrections[cd]==null?0:corrections[cd].down))*g_toMB
    var dcvu=(tdu-(corrections[cd]==null?0:corrections[cd].up))*g_toMB
    if(desc==''&&(tdu==''||tdu==0)&&(tdd==''||tdd==0)){
      $('#correction-row').hide()
      delete corrections[cd]
    }
    else if((tdu==''||tdu==0)&&(tdd==''||tdd==0)){
      return
    }
    else{
      corrections[cd]={desc:desc,down:tdd,up:tdu}
    }
    g_Settings['corrections'][mo+'-'+yr]=JSON.stringify(corrections)
    saveSettings()
    $('#remove-correction').fadeIn('slow')
    if(is_desc) return
    tdu=tdu*g_toMB
    tdd=tdd*g_toMB
    $('.cf-desc').text(desc)
    $('.cf-u').data('value',tdu)
    $('.cf-d').data('value',tdd)
    $('#correction-row .tByts ').data('value',tdu+tdd)
    $('#DailyData .is_d').each(function(){
      tdd+=$(this).find('.downloads').data('value')*1
      tdu+=$(this).find('.uploads').data('value')*1
    })
    $('#DailyFooter .downloads').data('value',tdd)
    $('#DailyFooter .uploads').data('value',tdu)
    $('#DailyFooter .tByts ').data('value',tdu+tdd)
    var ctb=$('#summary-'+ds+' .tByts ').data('value')*1
    var ctbd=$('#summary-'+ds+' .downloads ').data('value')*1
    var ctbu=$('#summary-'+ds+' .uploads ').data('value')*1
    $('#summary-'+ds+' .tByts ').data('value',ctb+dcvd+dcvu)
    $('#summary-'+ds+' .downloads ').data('value',ctbd+dcvd)
    $('#summary-'+ds+' .uploads ').data('value',ctbu+dcvu)
    displayBytes('#DailyFooter,#correction-row,#summary-'+ds)
    $('#correction-row').show()
    setPercents('#DailyData tr,#correction-row',tdu+tdd)
    if($('#daily-tab').hasClass('loaded')){
      DrawPie('Daily')
      DrawCandle()
    }
    if($('#monthly-tab').hasClass('loaded'))DrawPie('Monthly')
  })
  $("#mb-filter").change(function(){
    $('#MonthlyBreakdown,#breakdownFooter').html('')
    $('#monthly-breakdown-tab').removeClass('selected').removeClass('loaded').click()
    $('.mb-all')[$('#mb-filter').val()=='ALL'?'addClass':'removeClass']('hidden')
  })
  $('#dateFMT,#dateSep').change(function(){
    resetdates()
  })
  $('#dateFMT,#dateSep,#check4Updates,#isp-reminders').change(function(){
    updateSettings($(this).attr('id'),$(this).val())
    resetdates()
  })
  $('#isp-format').change(function(){
    var tv=$(this).val()
    if(tv==99){
      alert('Please contact me via questions@usage-monitoring.com to get your ISP added to this list.')
      return
    }
    if($('#isp-format option:selected').text()==''){
      g_Settings['isp-name']=$('#isp-format option:selected').text()
    }
    updateSettings('isp-format',tv)
    $('#settings-isp table').hide()
    $('#isp-'+tv).show()
    $('.isp-name').text($('#isp-format option:selected').text())
    saveSettings(false)
  })
  if(typeof(_dbkey)!='undefined'){
    $('#sv-btn').hide().removeClass('visible')
    $('#settings-columns input,#settings-columns radio,#settings-columns select,#settings-columns checkbox,.gr-cb').not('#isp-format').change(function(){
      $(this).parent('p').addClass('sv-req')
      saveSettings()
    })
  }
  $('#isp-in').keyup(function(){
    if($('#isp-in').val()==''){
      $('#process-isp').addClass('disabled')
      return
    }
    $('#process-isp').removeClass('disabled')
  })
  $('.p-cb-lbl,.p-cb').click(function () {
    setCB(this)
    return false
  })
  $('.ac-da').change(function () {
    clickCB(this)
  })
  /*Clicks*/
    $('._detanod, .amount').click(function (e) {
    var amt=$(this).attr('amount'),url = 'https://www.paypal.me/YAMon/'+amt;
    window.open(url, '_blank');
    return false
  });
  $('#Refresh').click(function(){
    $('#daily-tab').removeClass('loaded')
    var hourlyLoaded = loadHourly()
    hourlyLoaded.done(function(){
    })
    $(".RefreshInterval").html($("#RefreshInterval").val())
  })
  $('#Reset').click(function(){
    $(".RefreshInterval").html($("#RefreshInterval").val())
  })
  $('#StartPause').click(function(){
    if($(this).hasClass('paused')){
      clearInterval(refreshTimer)
      refreshTimer=setInterval(refreshTimerFunc,1000)
      $(this).removeClass('paused')
      $('#Reset,#Refresh').fadeIn('slow')
     }
    else{
      clearInterval(refreshTimer)
      $(this).addClass('paused')
      $('#Reset,#Refresh').fadeOut('slow')
     }
  });
  $('.del-row').mouseenter(function(){
    //if($(this).parents('.summary-row').is(':first-child'))return
    $(this).addClass('dhe')
  })
  $('.del-row').mouseleave(function(){
    $(this).removeClass('dhe')
  })
  $('.del-row').click(function(){
    //if($(this).parents('.summary-row').is(':first-child'))return
    var tid=$(this).parents('.summary-row').attr('id')
    deleteSummaryEntry(tid)
  })
  $('#blank-device-row .legend-colour, #blank-device-row .deviceName').click(function(e){
    $('.fd-sel').removeClass('fd-sel')
    var mac=$(this).parents('tr').data('mac')
    var cl=$('[data-mac="'+mac+'"] .legend-colour')
    var devn=$('[data-mac="'+mac+'"] .thedevice')
    var ishidden=cl.hasClass('op10')
    var struck=$(this).parents('tr').find('.thedevice').hasClass('so') 
    $(cl)[ishidden?'removeClass':'addClass']('op10')
    $(devn)[struck?'removeClass':'addClass']('so')
    $('[data-mac="'+mac+'"] .group,[data-mac="'+mac+'"] .num')[struck?'removeClass':'addClass']('so')
    DrawPie('Daily')
    DrawHourlyGraph()
    return false
  })
  $('#blank-device-row').dblclick(function(){
    $('.fd-sel').removeClass('fd-sel')
    $('#DailyData .legend-colour, #hourly-tbody .legend-colour').addClass('op10')
    $('#DailyData .thedevice, #DailyData .num, #hourly-tbody .thedevice, #hourly-tbody .group, #hourly-tbody .num').addClass('so')
    var mac=$(this).data('mac')
    $('[data-mac="'+mac+'"] .so').removeClass('so')
    $('[data-mac="'+mac+'"] .op10').removeClass('op10')
    DrawPie('Daily')
    DrawHourlyGraph()
    return false
  })
  $('.tab-div').find('h2:first').attr('title','Click to make this your default view').addClass('h2-tab btn')
  $('.settings-tab:visible').each(function () {
    var ov = $(this).attr('id'),
    bv = ov.replace('-tab', '')
    $('<option/>').attr('value', ov).text(bv).appendTo('#defvu')
  })
  $('#defvu').change(function(){
    var nv=$(this).val()
    $('.h2-tab.pref').removeClass('pref')
    $('#'+nv+'-tab-section .h2-tab').addClass('pref')
    g_Settings['defvu']=nv
    saveSettings()
  })
  if(!g_Settings['defvu']) g_Settings['defvu']='summary-tab'
  $('#defvu').val(g_Settings['defvu'])
  $('#'+g_Settings['defvu']+'-section .h2-tab').addClass('pref')
  $('.h2-tab').click(function(){
    $('.h2-tab.pref').removeClass('pref')
    $(this).addClass('pref')
    var dv=$(this).parents('.tab-div').attr('id').replace('-section','')
    $('#defvu').val(dv)
    g_Settings['defvu']=dv
    saveSettings()
  })
  $('.g2mr,.g2gr').click(function(e){
    var g_n=$(this).data('g-n')
    $('#mb-filter').val('dd-'+g_n).change()
    return false
  })
  $('.thedevice,.userName').click(function(e){
    var g_n=$(this).parents('tr').data('mac')||$(this).parents('tr').data('g-n')
    $('#mb-filter').val('dd-'+g_n).change()
    return false
  })
  $('.item-e').click(function(e){
    var is_e=$(this).hasClass('item-c')
    $(this)[is_e?'removeClass':'addClass']('item-c')
    var gn=$(this).parents('tr').attr('id')
    $('.'+gn).not('.is_z')[is_e?'removeClass':'addClass']('hidden')
    DrawPie('Daily')
    DrawHourlyGraph()
    DrawPie('Monthly')
    _unlimited_usage=='1' && DrawPie('Unlimited')
    return false
  })
  $('.p-cu').click(function(){
    if(_doCurrConnections==0) return
    $('.filterIP').text($(this).attr('ip'))
    $('.filter').removeClass('filter')
    $(this).addClass('filter')
    activeConnections()
  })
  $('.edit-d').click(function(e){
    if($(this).hasClass('writing')){
      $('.writing, .writing-row').removeClass('writing writing-row')
      $('#edit-device').hide()
      return false
    }
    $('.writing, .writing-row').removeClass('writing writing-row')
    var wr=$(this).parents('tr'),mac=wr.find('.deviceMAC').text(),mac_i=mac.split('-'),gn=wr.find('.group').text()
    wr.addClass('writing-row')
    var ic=devices[mac].hidden||false
    var hr=ic?$('#edit-device').children().not('.dnh'):$('#edit-device').children().not('.pick-colours')
    hr[ic?'hide':'show']()
    if(!orig_devices[mac]){
      orig_devices[mac]={group:gn,name:wr.find('.thedevice').text().trim()}
    }
    $('#group-list').html('')
    $('<option/>').attr('disabled','disabled ').text('Pick a group ').appendTo('#group-list')
    Object.keys(names).sort().forEach(function(n){
      var nul=names[n]['usage'].length
      if(n==''||nul==0){
        return
      }
      var sel=names[n]['group']==gn?' selected':''
      $('#group-list').append('<option value="'+names[n]['group']+'" class=""'+sel+'>'+names[n]['group']+'</option>')
    })
    $('#ed-mac').text(mac)
    $('#hide-device').prop('checked', ic)
    $('#ed-key').val(mac_i[1])
    $('#ed-owner').val(gn)
    $('#group-list').attr('size', 9)
    $('#ed-name').val(wr.find('.thedevice').text().trim())
    $('.ed-key')[!mac_i[1]?'hide':'show']()
    var def_colour=devices[mac].colour
    if(!def_colour){
      var r=wr.find('.legend-colour').css('background-color').replace("rgb(","").replace(")","").split(',')
      def_colour='#'+Number(0x1000000 + Number(r[0])*0x10000 + Number(r[1])*0x100 + Number(r[2])).toString(16).substring(1)
    }
    $('#ed-colour').val(def_colour)
    if(!g_Settings['devices'][mac]){
      $('#ed-clear').hide()
      $('#ed-update').text('Add')
    }
    else{
      $('#ed-clear').show()
      $('#ed-update').text('Update')
    }
    $('.bad_value').removeClass('bad_value')
    $('#edit-device').css('top',$(this).position()['top']+14).css('left',18).slideDown('slow')
    $(this).addClass('writing')
    return false
  })
  $('.is_dd').click(function(){
    if($(this).hasClass('writing-row')){
      $('.writing, .writing-row').removeClass('writing writing-row')
      $('#edit-device').hide()
      return
    }
    $('.writing, .writing-row').removeClass('writing writing-row')
    $(this).addClass('writing-row')
    var wr=$(this),mac=wr.find('.deviceMAC').text()
    $('#ed-mac').text(mac)
    $('#ed-owner').val(wr.find('.group').text())
    $('#ed-name').val(wr.find('.deviceName').text())
    $('#ed-colour').val(devices[mac].colour)
    if(!g_Settings['devices'][mac]){
      $('#ed-clear').hide()
      $('#ed-update').text('Add')
    }
    else{
      $('#ed-clear').show()
      $('#ed-update').text('Update')
    }
    $('.bad_value').removeClass('bad_value')
    $('#edit-device').slideDown('slow')
    wr.find('.edit-d').addClass('writing')
  })
  $('#blank-devices-row .group').click(function(){
    $('.writing, .writing-row').removeClass('writing writing-row')
    $('#edit-device').hide()
    var u_n=clean($(this).text())
    $('#mb-filter').val('dd-'+u_n).change()
    return false
  })
  $('#blank-devices-row .thedevice').click(function(e){
    $('.writing, .writing-row').removeClass('writing writing-row')
    $('#edit-device').hide()
    return false
  })
  $('#blank-devices-row')
    .mouseenter(function (e) {
      $(this).find('.edit-d').css('background-position', 'center -9px')
    })
    .mouseleave(function (e) {
      $(this).find('.edit-d').css('background-position', 'center 11px')
    })
    .click(function (e) {
      $(this).find('.edit-d').click()
    })
  $('#blank-acon-row .dest-ip').click(function(e){
    var ctd=$(this), href= domain+'current/getIP.php?ip='+ctd.text()
    $.get(href)
    .done(function(list,textStatus){
      var ip=ctd.attr('title')
      if(!list['org']) return
      var nt=list['org']+"|"+list['country']+"|"+list['city'], iptxt=list['org']+(list['city']==''?'':'<br/>'+list['city'])
      $(".dest-ip[title='"+ip+"']").each(function(){
        $(this).unbind('click').html(iptxt).addClass('ipfnd')
        $(this).next().find('.flag').addClass(list['country'].replace(/ /g,'-')).attr('title',list['country'])
      })
      g_IPs[ip]=nt
      g_IPs['dirty']=true
    })
  })
  $('#ip-sync').click(function (e) {
    var url=domain + 'db/syncIPs.php'
    if ((g_Settings['useHTTPS']) || (location.protocol=='https')) domain = 'https://usagemonitoringcom.ipage.com'
    var request = $.ajax({
      url: url,
      type: 'POST',
      dataType: 'json'
    });
    request.done(function (data) {
      if (data.response == 'success') {
        var vv=(data.results).split('\n')
        $('.ip-prog').show()
        vv.forEach(function(r,n){
          if(r=='') return
          var cv=r.split('~')
          g_IPs[cv[0]]=cv[1]
         })
        $('#ip-n').text(vv.length)
        saveIPs()
        activeConnections()
      }
      else if (data.response == 'error') {
        alert(data.comment);
      }
    });
    request.fail(function (jqXHR, textStatus) {
      if(confirm("Syncing the IP values failed with error message: " + textStatus +":  " +  errorThrown +"?!?\n\nClick `OK` to try again or `Cancel`")){
        $('#ip-sync').click()
      }
    });
    request.complete(function (jqXHR, textStatus) {
    });
  })
  $('#luReset').click(function(){
    $('#liveServer').html('')
    setLiveUpdates()
  })
  $('#luStop').click(function(){
    $(this).fadeOut('slow','',function(){
      $('#luStart').fadeIn('slow')
    })
    clearInterval(liveUpdatesTimer);
  })
  $('#luStart').click(function(){
    $(this).fadeOut('slow','',function(){
      $('#luStop').fadeIn('slow')
    })
    setLiveUpdates()
    liveUpdatesTimer=setInterval(setLiveUpdates,1000*_updatefreq);
  })
  $('c-h_sd').mouseleave(function(){
    $(this).slideUp('slow')
  })
  $('#h_sd').click(function(){
    $('.fd-sel, .fd-some').removeClass('fd-sel fd-some')
    $(this).removeClass('partial').toggleClass('checked');
    ShowDevices($(this).hasClass('checked')?'all':'none')
    return false;
  })
  $('.ts').click(function () {
    var tsd=$(this).siblings('.ts-d'),tsp=$(this).parents('.ts-w'),iv=tsd.is(':visible')
    if(iv){
      tsd.slideUp('slow')
      tsp.removeClass('ts-wv')
    }
    else{
      tsp.addClass('ts-wv')
      tsd.slideDown('slow')
    }
  })
  $(".pDBtn").click(function (){
    _cr_Date=newdate(_cr_Date,-1)
    if(_cr_Date<_rs_Date){
      _cr_Date=_rs_Date
      return
    }
    $('.current-date').text(formattedDate(_cr_Date));
    $('#daily-tab').removeClass('loaded')
    $('#DailyData .num').each(function(){
      $(this).data('value','').attr('title', '')
    })
    var hourlyLoaded = loadHourly()
    hourlyLoaded.done(function(){
    })
  });
  $(".nDBtn").click(function (){
    var today=new Date();
    _cr_Date=newdate(_cr_Date,1)
    if(_cr_Date>_re_Date){
      _cr_Date=_re_Date
      return
    }
    else if(_cr_Date>today){
      _cr_Date=today
      return
    }
    $('.current-date').text(formattedDate(_cr_Date))
    $('#daily-tab').removeClass('loaded')
    $('#DailyData .num').each(function(){
      $(this).data('value','').attr('title', '')
    })
    var hourlyLoaded = loadHourly()
    hourlyLoaded.done(function(){
    })
  });
  $(".fDBtn").click(function (){
    _cr_Date=_rs_Date
    $('#daily-tab').removeClass('loaded')
    $('.current-date').text(formattedDate(_cr_Date))
    $('#DailyData .num').each(function(){
      $(this).data('value','').attr('title', '')
    })
    var hourlyLoaded = loadHourly()
    hourlyLoaded.done(function(){
    })
  });
  $(".lDBtn").click(function (){
    var today=new Date();
    _cr_Date=_re_Date>today?today:_re_Date
    $('#daily-tab').removeClass('loaded')
    $('.current-date').text(formattedDate(_cr_Date))
    $('#DailyData .num').each(function(){
      $(this).data('value','').attr('title', '')
    })
    var hourlyLoaded = loadHourly()
    hourlyLoaded.done(function(){
    })
  });
  $('.go2today').click(function(){
    _cr_Date=new Date()
    $('#daily-tab').removeClass('loaded')
    $('#DailyData .num').each(function(){
      $(this).data('value','').attr('title', '')
    })
    var hourlyLoaded = loadHourly()
    hourlyLoaded.done(function(){
    })
  })
  $('.current-interval').click(function(){
    $('#monthly-tab').click()
  })
  $('#nmBtn').addClass('nmBtn')
  $('#pmBtn').addClass('pmBtn')
  $('.current-interval').before("<button class='pmBtn' title='Go to the first day of the previous interval' type='button'></button>").after("<button class='nmBtn' title='Go to the first day of the next interval' type='button'></button>")
  $('.pmBtn').click(function () {
    var prd=$('.currentSummary').attr('id').split('-')
    prd[1] -= (prd[1]==1 ? - 11 : 1),
    prd[0] -= prd[1]==12 ? 1 : 0
    var nrd=prd[0] + '-' + twod(prd[1]) + '-' + twod(prd[2])
    if ($('#' + nrd).length==0) {
      var nr=$('.currentSummary').clone()
      nr.attr('id',nrd)
      nr.find('.interval').text(nrd)
      nr.find('.st-pt').html('').removeAttr('id').removeAttr('data-value').removeClass('num Kbytes MBytes GBytes').text('-')
      nr.find('.num').removeAttr('data-value').removeClass('Kbytes MBytes GBytes').text('-')
      $('.currentSummary').after(nr)
    }
    $('#MonthlyData .num').each(function(){
      $(this).data('value','').attr('title', '')
    })
    $('.currentSummary').removeClass('currentSummary')
    $('#'+nrd).addClass('currentSummary')
    var monthlyLoaded = loadMonthly();
    monthlyLoaded.done(function(){
      var hourlyLoaded = loadHourly()
      hourlyLoaded.done(function(){
      })
    });
  })
  $('.nmBtn').click(function () {
    if($('.currentSummary').is(':first-child')) return
    var prd=$('.currentSummary').attr('id').split('-')
    prd[1] -= (prd[1]*1==12 ? - 11 : -1),
    prd[0] -= prd[1]*1==1 ? -1 : 0
    var nrd=prd[0] + '-' + twod(prd[1]) + '-' + twod(prd[2])
    if ($('#' + nrd).length==0) {
      var nr=$('.currentSummary').clone()
      nr.attr('id',nrd)
      nr.find('.interval').text(nrd)
      $('.currentSummary').before(nr)
    }
    $('#MonthlyData .num').each(function(){
      $(this).data('value','').attr('title', '')
    })
    $('.currentSummary').removeClass('currentSummary')
    $('#'+nrd).addClass('currentSummary')
    var monthlyLoaded = loadMonthly();
    monthlyLoaded.done(function(){
      var hourlyLoaded = loadHourly()
      hourlyLoaded.done(function(){
      })
    });
  })
  $('.table-units').click(function(){
    var cv=$(this).text()
    $('#displayUnits').val(cv).change()
  })
  $('.add-h').click(function(){
    if(!$(this).hasClass('btn')) return
    var lr=$('.summary-row').last().attr('id').split('-');
    var mo=(lr[1]==1?12:lr[1]-1),yr=lr[0]-(mo==12?1:0),hid=yr+'-'+twod(mo)+'-'+twod(lr[2])
    var nr=$('.summary-row').last().clone()
    nr.attr('id',hid)
    nr.find('.interval').text(hid)
    nr.find('.st-pt').html('').removeAttr('id').removedata('value').removeClass('num Kbytes MBytes GBytes over-cap cap-90  cap-80 cap-40 cap-ok')
    $('.currentSummary').removeClass('currentSummary')
    nr.appendTo('#SystemTotalsTable').addClass('currentSummary')
    var monthlyLoaded = loadMonthly();
    monthlyLoaded.done(function(){
      var hourlyLoaded = loadHourly()
    });
    saveSettings()
  })
  $('#sp_num_devices,#sp_num_active_devices,.nad').click(function(){
    $('#devicesData tr.odd').removeClass('odd')
    $('#ShowZeroes').click()
    $('#devicesData tr:visible:odd').addClass('odd')
  })
  $('.dshd').click(function(){
    $('#devicesData .odd').removeClass('odd')
    $('#ShowHiddenDevices').click()
    hiddenDevices()
  })
  $('.gr-cb').change(function(){
    DrawGraph($(this).attr('id'))
    set_bd_graphs()
  })
  $('#all-graphs').click(function(){
    $('.gr-cb').prop('checked','checked')
    drawGraphs()
    set_bd_graphs()
  })
  $('#no-graphs').click(function(){
    $('.gr-cb').prop('checked',false)
    drawGraphs()
    set_bd_graphs()
  })
  $('.ddp').click(function(){
    $(this).siblings().removeClass('sel')
    $(this).addClass('sel')
    updateSettings('is-isp-ddp',$('.is-isp .ddp.sel').attr('id'))
    updateSettings('is-rd-ddp',$('.is-rd .ddp.sel').attr('id'))
    $('#MonthlyBreakdown,#breakdownFooter').html('')
    setMonthlyBreakdown()
  })
  $('.rest-new').click(function(){
    if($(this).hasClass('rest-close')){
      $('.edit-restrictions .rest-close').click()
      return false
    }
    var tr=$(this).parents('table').find('tr:last')
    $('#restrictions-list tr').removeClass('hidden odd cer')
    $('.edit-restrictions').insertAfter(tr)
    $('.ac-da, .ac-gp').prop('checked', false)
    $('#ac-da, #ac-gp').attr('state', '').find('.p-cb-st').removeClass('partial checked')
    $('.ac-start,.ac-end').val('')
    $('.rst-name').val('')
    //$(this).addClass('hidden')
    $(this).addClass('rest-close')
    $('.rest-delete').addClass('hidden')
    $('#restrictions-list tr:visible:odd').addClass('odd')
  })
  $('.rest-close').click(function(){
    $('#restrictions-list tr,.rest-new').removeClass('hidden odd cer')
    $('.rest-new').removeClass('rest-close')
    $('.edit-restrictions').addClass('hidden')
    $('#restrictions-list tr:visible:odd').addClass('odd')
  })
  $('.rest-save').click(function () {
    var tr = $(this).parents('.edit-restrictions'),cr=$('.restriction-row.cer')
    if(cr.length==0){
      cr=$('.restriction-row:last').clone(true,true).detach().addClass('cer hidden')
      cr.find('.rest-days').text('No days selected!')
      cr.find('.rest-time').text('No times selected!')
      cr.find('.rest-groups').text('No groups selected!')
      cr.insertAfter($('.restriction-row:last'))
    }
    var rest = {},d_lst = [],dn_lst = [],g_lst = [],gn_lst = []
    var name = tr.find('.rst-name').val(),oname=cr.find('.rest-name').text()
    if(oname!=name) delete g_Restrictions[oname]
    cr.find('.rest-name').text(name)
    tr.find('.ac-da:checked').each(function () {
      d_lst.push($(this).attr('dn'))
      dn_lst.push($(this).parent('label').text())
    })
    tr.find('.ac-gp:checked').each(function () {
      g_lst.push($(this).data('value'))
      gn_lst.push($(this).parent('label').text())
    })
    rest.days = d_lst.join(',')
    var rt= tr.find('.ac-start').val()+'-'+tr.find('.ac-end').val()
    rest.times =rt
    rest.groups = g_lst.join(',')
    if(dn_lst.length>0) cr.find('.rest-days').data('value', rest.days ).text(dn_lst.join(', '))
    cr.find('.rest-time').text(rt)
    if(gn_lst.length>0) cr.find('.rest-groups').data('value', rest.groups ).text('All except: '+gn_lst.join(', '))
    $(this).fadeOut('slow')
    g_Restrictions[name]=rest
  })
  $('.rest-btn').click(function () {
    var tr = $(this).parents('tr')
    $('#restrictions-list tr,.rest-delete,.rest-new').removeClass('hidden odd cer')
    $('.edit-restrictions').insertAfter(tr)
    tr.addClass('hidden cer')
    $('.ac-da, .ac-gp').prop('checked', false)
    $('#ac-da, #ac-gp').attr('state', '').find('.p-cb-st').removeClass('partial checked')
    $('.ac-start,.ac-end').val('')
    $('.rst-name').val('')
    $('#restrictions-list tr:visible:odd').addClass('odd')
    $('.rst-name').val(tr.find('td:first').text())
    var dl = (tr.find('td:nth-child(2)').data('value') || '').split(','),ni = dl.length,ns,gd = null
    for (var i = 0; i < ni; i++) {
      if (dl[i] == '') continue
      gd = true
      $('#ac-da-' + dl[i]).prop('checked', true)
    }
    if (ni == 7) ns = 'checked'
    else if (ni == 0 || !gd) ns = ''
    else ns = 'partial'
    $('#ac-da').attr('state', ns)
    $('#ac-da .p-cb-st').removeClass('checked partial').addClass(ns)
    var ti = (tr.find('td:nth-child(3)').text() || '').split('-')
    $('.ac-start').val(ti[0])
    $('.ac-end').val(ti[1])
    var gl = (tr.find('td:nth-child(4)').data('value') || '').split(','),ni = gl.length
    for (var i = 0; i < ni; i++) {
      if (gl[i] == '') continue
      gd = true
      $('#ac-gp-' + gl[i]).prop('checked', true)
    }
    if (!gd || $('.ac-gp:checked').length==0) ns = 'checked'
    else if ($('.ac-gp').length == $('.ac-gp:checked').length) ns = ''
    else ns = 'partial'
    $('#ac-gp').attr('state', ns)
    $('#ac-gp .p-cb-st').removeClass('checked partial').addClass(ns)
  })
  $('.edit-restrictions .rest-btn').unbind('click')
  $('.l-c').hide()
  $('.rest-delete').click(function(){
    if(!confirm("Are you sure?  There's no undo!"))return
    var dr=$(this).parents('tr')
    dr.addClass('hidden')
    $('.cer').remove()
    $('.rest-new').removeClass('rest-close')
    $('.pick-colours').hide()
    $('.l-c').hide()
  })
  $('#ed-owner')
    .focus(function(){
      $('#group-list').fadeIn('slow').slideDown('slow')
    })
    .blur(function(){
      $('#group-list').fadeOut('slow').slideUp('slow')
    })
    .change(function(){
      var oname=$(this).val()
      var ll='|';
      $('#group-list option:enabled').each(function(){
        ll+=($(this).text()+'|')
      })
      if(ll.indexOf('|'+oname+'|')==-1){
        $('#group-list').append('<option value="'+oname+'" class="">'+oname+'</option>')
      }
      $('#group-list').fadeOut('slow').slideUp('slow')
      $('#ed-update').removeClass('not-sel')
  })
  $('#ed-name').change(function(){
    $('#ed-update').removeClass('not-sel')
  })
  $('#ed-colour')
    .focus(function(){
      $('.pick-colours').fadeIn('slow').slideDown('slow')
    })
    .change(function(){
      $('#ed-update').removeClass('not-sel')
  })
  $('#ed-update').click(function(){
    if($(this).hasClass('not-sel')) return false

    var nc=$('#ed-colour').val()=='TBD'?'':$('#ed-colour').val(), oname=($('#ed-owner').val()).trim(), loname=oname.toLowerCase()
    if(oname==''||$('#ed-name').val()==''){
      alert('The device owner and/or device name fields cannot be empty')
      if (oname=='') $('#ed-owner').addClass('bad_value').focus()
      if($('#ed-name').val()=='') $('#ed-name').addClass('bad_value').focus()
      return
    }
    var tmac=$('#ed-mac').text()
    if(!!orig_devices[tmac] && !!g_Settings['devices'][tmac] && (oname==g_Settings['devices'][tmac].group) && ($('#ed-name').val()==g_Settings['devices'][tmac].name) && (nc==g_Settings['devices'][tmac].colour)){
      $('.ed-close').click()
      return
    }
    g_Settings['devices'][tmac]={"group":oname,"name":$('#ed-name').val(),"colour":nc,"hidden":$('#hide-device').is(':checked')}

    saveSettings()
    devices[tmac].group=oname
    devices[tmac].cg=loname
    devices[tmac].name=$('#ed-name').val()
    devices[tmac].colour=nc
    if(!names[loname]){
      var n=Object.keys(names).length
      if(_unlimited_usage=='0'){
        names[loname]={n:n,group:oname,down:0,up:0,usage:[]}
        names[loname]['usage'][0]=0
      }
      else{
        names[loname]={n:n,group:oname,down:0,up:0,ul_down:0,ul_up:0,usage:[]}
        names[loname]['usage'][0]=0
      }
    }

    $('.writing-row').removeClass('writing-row')
    var tid='#dd-'+devices[tmac].id
    $(tid).addClass('cs_edit')
    $(tid +' .thedevice').text($('#ed-name').val().trim())
    $(tid +' .group').text(oname)
    $(tid +' .legend-colour').css('backgroundColor',nc)
    $('.loaded').removeClass('loaded')
    $('#DailyData,#MonthlyData, #MonthlyBreakdown').html('')
    $('#edit-device').slideUp('slow')
    $('.l-c').hide()
    $('.dc-p.not-sel').removeClass('not-sel')

    $('.pick-colours').hide()
    $('#ed-clear').show()
    $('#ed-update').text('Update').addClass('not-sel')
  })
  $('#ed-clear').click(function(){
    if(!confirm('Are you sure you want to delete these edits?  There is no undo!')) return
    delete g_Settings['devices'][$('#ed-mac').text()]
    $('#ed-clear').hide()
    $('#ed-update').text('Add')
    $('.writing').removeClass('writing')
    saveSettings()
    var tid='#dd-'+devices[$('#ed-mac').text()].id
    $(tid).removeClass('cs_edit')
    $(tid +' .thedevice').text(orig_devices[$('#ed-mac').text()].name)
    $(tid +' .group').text(orig_devices[$('#ed-mac').text()].group)
    $('.writing-row').removeClass('writing-row')
    $('.loaded').removeClass('loaded')
    $('#DailyData,#MonthlyData,#orig_device').html('')
    $('#edit-device').slideUp('slow')
    $('.pick-colours').hide()
    $('.dc-p.not-sel').removeClass('not-sel')
    $('#ed-update').addClass('not-sel')
    $('.l-c').hide()
  })
  $('.ed-close').click(function(){
    $('.writing').removeClass('writing')
    $('.writing-row').removeClass('writing-row')
    $('.pick-colours').hide()
    $('.dc-p.not-sel').removeClass('not-sel')
    $('#ed-update').addClass('not-sel')
    $('.l-c').hide()
    $('#edit-device .dlog-close').click()
  })
  $('#hide-device').change(function(){
    var ic=$(this).is(':checked')
    var hr=ic?$(this).parent().siblings().not('.dnh'):$(this).parent().siblings().not('.pick-colours')
    hr[ic?'slideUp':'slideDown']('slow')
  })
  $('.dc-p').click(function(){
    var wc=$(this).attr('id')
    $(this).removeClass('not-sel')
    $(this).siblings().addClass('not-sel')
    $('.l-c').hide()
    $('.c-'+wc).fadeIn('slow')
  })
  $('.l-c').click(function(){
    var r=$(this).css('background-color').replace("rgb(","").replace(")","").split(',')
    var hx=Number(0x1000000 + Number(r[0])*0x10000 + Number(r[1])*0x100 + Number(r[2])).toString(16).substring(1)
    $('#ed-colour').val('#'+hx).change()
  })
  $('.alert-icon').click(function(){
    $(this).addClass('viewed')
    $('#myAlert')[$('#myAlert').is(':visible')?'slideUp':'slideDown']('slow')
    return false
  })
  $('#devicesHeader th').addClass('sortable')
  $('.sortable').unbind('click').click(function () {
    var t = $(this)
    var col = $('#devicesHeader th').index(t)
    var sort_order = $(t).hasClass('sort-a') ? - 1 : 1
    $('.sort-a').removeClass('sort-a')
    $('.sort-d').removeClass('sort-d')
    t.addClass(sort_order == 1 ? 'sort-a' : 'sort-d')
    g_Settings['sort-devices']= (sort_order == 1 ? '' : '-')+col
    saveSettings()
    if(col==5) return
    sortDevices(col,sort_order)
  })
  $('.icon, .log').click(function(){
    window.open($(this).data('link'), '_blank');
    return false;
  })
  $('#process-isp').click(function(){
    if($('#isp-format').length==0){
      $('#isp-import-results').addClass('oops').html("You must upgrade to the latest version of `yamon3.3.html`!<br/>See the <a target='_blank' href='http://usage-monitoring.com/manualInstall.php'>Manual Install</a> page for more info (or run `install.sh` on your router again.").fadeIn('slow')    
      return
    }
    var w_isp=$('#isp-format').val()
    if (!w_isp||w_isp==0||w_isp==99){
      $('#isp-import-results').addClass('oops').html("You must select an entry from the list of ISPs!<br/>If yours is not in the list, send a sample of your data to <a href='mailto:questions@usage-monitoring.com'>questions@usage-monitoring.com</a>.").fadeIn('slow')   
      return
    }
    var in_txt=$('#isp-in').val().split('\n')
    if (in_txt==''){
      $('#isp-import-results').addClass('oops').html("This field cannot be empty... paste the contents of your ISP totals table into this field.").fadeIn('slow') 
      return
    }
    var months=["January","February","March","April","May","June","July","August","September","October","November","December"]
    var months_ab=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
    var mois=["janvier","fÃ©vrier","mars","avril","mai","juin","juillet","aoÃ»t","septembre","octobre","novembre","dÃ©cembre"]
    var out_txt={},mn,yr, down, up, ml, mo
    ml=months
    switch (w_isp) {
      case 'Rogers': /* Rogers */
        $.each(in_txt,function(index,item) {
          var line=item.trim(' ').replace(/,/g,'').replace(/\s+/g,' ').split(' ')
          var dn=line[1]*1
          if(isNaN(dn)) return
          down=line[3]*g_toMB
          up=line[4]*g_toMB
          if(isNaN(down)||isNaN(up)) return
          mn=line[0]
          yr=line[2]
          out_txt[dn]={down:down,up:up}
        });
        mo=twod(ml.indexOf(mn)+1)
        break;
      case 'Electronic Box': /* Electronic Box */
        $.each(in_txt,function(index,item) {
          var line=item.trim(' ').replace(/G/g,'').replace(/-/g,' ').replace(/\s+/g,' ').split(' ')
          var dn=line[2]*1
          if(isNaN(dn)) return
          down=(line[3]*g_toGB).toFixed(0)
          up=(line[4]*g_toGB).toFixed(0)
          if(isNaN(down)||isNaN(up)) return
          mn=months[line[1]-1]
          yr=line[0]
          out_txt[dn]={down:down,up:up}
        });
        mo=twod(ml.indexOf(mn)+1)
        break;
      case 'Bell (Eng)': /* Bell (Eng) */
        $.each(in_txt,function(index,item){
          var line=item.replace(/"/g,'').split(',')
          var td=line[0].replace(/,/g,'').split(' ')
          var dn=td[1]*1
          if (isNaN(dn)) return
          down=(line[2]*g_toGB).toFixed(0)
          up=(line[3]*g_toGB).toFixed(0)
          if(isNaN(down)||isNaN(up)) return
          mn=td[0]
          yr=line[1].trim(' ')
          out_txt[dn]={down:down,up:up}
        });
        mo=twod(ml.indexOf(mn)+1)
        break;
      case 'Bell (Fr)': /* Bell (Fr) */
        ml=mois
        $.each(in_txt,function(index,item){
          var line=item.replace(/","/g,'|').replace(/"/g,'').split('|')
          var td=line[0].replace(/,/g,'').split(' ')
          var dn=td[1]*1
          if (isNaN(dn)) return
          down=((line[1]+"").split(',')[1]*g_toGB/1000).toFixed(0)
          up=((line[2]+"").split(',')[1]*g_toGB/1000).toFixed(0)
          if(isNaN(down)||isNaN(up)) return
          mn=td[0]
          yr=td[2]
          out_txt[dn]={down:down,up:up}
        });
        mo=twod(ml.indexOf(mn)+1)
        break;
      case 'Cox': /* Cox */
        up = 0
        $.each(in_txt, function (index, item) {
          var line = item.replace(/\s+/g, ' ').split(' ')
          var td = line[0].split('/')
          var dn = td[1] * 1
          if (isNaN(dn)) return
          down = (line[1] * g_toGB).toFixed(0)
          up = (line[2] * g_toGB).toFixed(0)
          if (isNaN(down)) return
          mn = td[0]
          yr = td[2]
          out_txt[dn] = {down: down,up: up}
        });
        mo=twod(mn)
        break;
      case 'ATT': /* ATT */
        var up = 0
        $.each(in_txt, function (index, item) {
          var line = item.replace(/\s+/g, ' ').split(' ')
          var td = line[0].split('/')
          var dn = td[1] * 1
          if (isNaN(dn)) return
          down=(line[1]*g_toGB).toFixed(0)
          up=(line[2]*g_toGB).toFixed(0)
          if (isNaN(down)) return
          mn = td[0]
          yr = td[2]
          out_txt[dn] = {down: down,up: up}
        });
        mo=twod(mn)
        break;
      case 'Telstra': /* Telstra */
        $.each(in_txt, function (index, item) {
          var line = item.replace(/\s+/g, ' ').split(' ')
          var dn = line[0] * 1
          if (isNaN(dn)) return
          down = (line[3] * g_toMB).toFixed(0)
          up = (line[4] * g_toMB).toFixed(0)
          if (isNaN(down)) return
          mn = line[1]
          out_txt[dn] = {
            down: down,
            up: up
          }
        });
        var dyv=new Date().getFullYear()
        yr = prompt('Please confirm the year associated with this data:', dyv)
        if ((!yr)||isNaN(yr)){
          alert('Error:: the entered value for Year is not valid!')
          return
        }
        mo=twod(months_ab.indexOf(mn))
        break;
      case 'Sodetel': /* Sodetel */
        $.each(in_txt, function (index, item) {
          var line = item.replace(',','').replace(/\s+/g, ' ').split(' ')
          var dn = line[1] * 1
          if (isNaN(dn)) return
          var pdn = !out_txt || !out_txt[dn] ? 0 : out_txt[dn].down,
          pup = !out_txt || !out_txt[dn] ? 0 : out_txt[dn].up
          down = (line[5] * g_toMB).toFixed(0)
          pdn += down * 1
          up = (line[6] * g_toMB).toFixed(0)
          pup += up * 1
          if (isNaN(down)) return
          mn = line[0]
          yr = line[2]
          out_txt[dn] = {
            down: pdn,
            up: pup
          }
        });
        var tmn=ml.filter(function(m){
          if(m.indexOf(mn)==0) return m
        })
        mo = twod(ml.indexOf(tmn[0]) + 1)
        break;
      case 'TekSavvy': /* TekSavvy */
        $.each(in_txt, function (index, item) {
          var line = item.split(','),td=line[0].split(' ')
          var dn = td[1] * 1
          if (isNaN(dn)) return
          down=(line[1]*g_toGB).toFixed(0)
          up=(line[2]*g_toGB).toFixed(0)
          if (isNaN(down)) return
          mn = td[0]
          yr = td[2]
          out_txt[dn] = {down: down,up: up}
        })
        var tmn=ml.filter(function(m){
          if(m.indexOf(mn)==0) return m
        })
        mo = twod(ml.indexOf(tmn[0]) + 1)
        break;
      case 'GCI': /* GCI */
        var in_txt=$('#isp-in').val().split('\n'), out_txt={},jd=''
        $.each(in_txt, function (index, item) {
          var line = item.trim(' ').replace(/\s+/g, ' ').replace(/GB/g, '').split(' ')
          if (line.length==1){
            jd=line
            return
          }
          line=$.merge( jd, line )
          var td = line[0].replace(/,/g, '').split('/')
          var dn = td[1] * 1
          if (isNaN(dn)) return
          down = (line[1] * g_toGB).toFixed(0)
          up = (line[2] * g_toGB).toFixed(0)
          if (isNaN(down)) return
          mn = td[0]
          yr = td[2]
          out_txt[dn] = {
            down: down,
            up: up
          }
        })
        mo = twod(mn)
        break;
      case 'Videotron': /* Videotron */
        var in_txt=$('#isp-in').val().split('\n'), out_txt={}
        $.each(in_txt, function (index, item) {
          var line = item.trim(' ').replace(/\s+/g, ' ').split(' ')

          var mn = line[0], dn = line[1] * 1
          if (isNaN(dn)) return
          down = (line[2] * g_toGB).toFixed(0)
          up = (line[3] * g_toGB).toFixed(0)
          if (isNaN(down)) return
          if (down==0&&up==0) return
          out_txt[dn] = {
            down: down,
            up: up
          }
        })
      case 'Cable ONE': /* Cable ONE */
        up = 0
        $.each(in_txt, function (index, item) {
          var line = item.replace(/\s+/g, ' ').split(' ')
          var td = line[0].split('/')
          var dn = td[1] * 1
          if (isNaN(dn)) return
          down = (line[1] * g_toGB).toFixed(0)
          up = (line[2] * g_toGB).toFixed(0)
          if (isNaN(down)) return
          if (isNaN(up)) up=0
          mn = td[0]
          yr = td[2]
          out_txt[dn] = {down: down,up: up}
        });
        mo=twod(mn)
        break;
      case 'Afrihost': /* Afrihost */
        up = 0
        $.each(in_txt, function (index, item) {
          var line = item.replace(/\s+/g, ' ').split(' ')
          var td = line[0].split('/')
          var dn = td[0] * 1
          if (isNaN(dn)) return
          down = (line[2] * g_toMB).toFixed(0)
          up = (line[3] * g_toMB).toFixed(0)
          if (isNaN(down)) return
          if (isNaN(up)) up=0
          mn = td[1]
          yr = td[2]
          out_txt[dn] = {down: down,up: up}
        });
        mo=twod(mn)
        break;
    }
    $('#isp-out').val(mo+'-'+yr+'='+JSON.stringify(out_txt))
    if($('#show-isp-out').is(':checked')) $('#isp-out').fadeIn('slow')
    if(isNaN(mo)||isNaN(yr)){
      $('#isp-import-results').addClass('oops').html('There was a problem computing the month ('+mo+') or year ('+yr+') values?!?.<br/>Please contact Al at questions@usage-monitoring.com.').fadeIn('slow')
      return
    }
    if(JSON.stringify(out_txt)=='{}'){
      $('#isp-import-results').addClass('oops').html('There was a problem parsing the data?!?.<br/>Check `Show isp-out` on the Settings tab and then click `Process` again.  Then contact Al at questions@usage-monitoring.com.').fadeIn('slow')
      return
    }
    g_Settings['isp'][mo+'-'+yr]=JSON.stringify(out_txt)
    var lcd = new Date(), lcd_s=formattedDate(lcd)
    $('#isp-lcd').text(lcd_s)
    g_Settings['isp-lcd']=lcd_s
    g_Settings['isp-ncd']='0x'+((((lcd.setDate(lcd.getDate()+14))/1000).toFixed(0))*1).toString(16)
    saveSettings()
    $('#isp-import-results').removeClass('oops').html('Your `' +$('#isp-format option:selected').text()+ '` data has been successfully imported.<br/>Reload the reports and change to the Monthly Breakdown tab to see how your totals compare with theirs.').fadeIn('slow')
    $(this).addClass('disabled')
  })
  $('.export').on('click', function (e) {
    exportTableToCSV.call(this, $(this).parents('table').attr('id'));
    e.stopPropagation()
  });

  $('#show-local').click(function(){
    $('.acon-row.odd').removeClass('odd')
    var ic=$(this).is(':checked')
    $('#act-dest').text(ic?'All Destinations':'External Destinations Only')
    $('.dest-ip[title^="'+$('#acc-filter-ip').val()+'"],.dest-ip[title^="255.255."]').parents('.acon-row')[ic?'show':'hide']()
    $('.show-local')[ic?'show':'hide']()
    $('.acon-row:visible:odd').addClass('odd')
    $('#acrc').text($('.acon-row:visible').length)
    $('#acc-filter-name').text($('.filter:first .cu-o').text()+'-'+$('.filter:first .cu-d').text())
    g_Settings['show-local']=ic
    saveSettings(false)
  })
  $('#acc-filter-ip').change(function(){
    g_Settings['acc-filter-ip']=$('#acc-filter-ip').val()
    saveSettings(false)
  })
  $('.info.btn,.ts.btn').click(function () {
    var ww = $(this),
    wp = ww.parents('.info-top'),
    ii = ww.hasClass('info')
    ww.siblings().removeClass('sc')
    if (ww.hasClass('sc')) {
      ww.removeClass('sc')
      wp.find('.info-tr').removeClass('hidden').fadeOut('slow')
      wp.find('.info-s').removeClass('hidden').fadeOut('slow')
      return(false)
    }
    ww.addClass('sc')
    wp.find('.info-tr').removeClass('hidden').fadeIn('slow')
    wp.find('.info-s').removeClass('hidden').fadeIn('slow')
    wp.find('.info-d') [ii ? 'show' : 'hide']()
    wp.find('.ts-d') [ii ? 'hide' : 'show']()
    return(false)
  })
  $('.close').click(function () {
    var wp = $(this).parents('.info-top')
    $(this).parents('.info-s').fadeOut('slow')
    $(this).parents('.info-tr').fadeOut('slow')
    wp.find('.sc').removeClass('sc')
  })
  $('.dlog-close').click(function(){
    $(this).parents('.dlog').slideUp('slow')
    $('.not-viewed').removeClass('not-viewed')
    $('.writing, .writing-row').removeClass('writing writing-row')
  })
  $('#alert-clear').click(function(){
    $('#myAlert-body').html('')
    $('#myAlert').slideUp('slow')
    $('.alert-icon').fadeOut('slow')
  })
  $('#st-d-db, #st-d-ub,#st-d-tb, #ds-olt .g2dr').click(function(){
    $('#daily-tab').click()
  })
  $('#st-i-db,#st-i-ub,#st-i-tb,#ds-olt').click(function(){
    $('#monthly-tab').click()
  })
  $("#myAlert").draggable({ cursor: "move",cancel:"#myAlert-body, .mab"});
  $('#group-list').change(function(){
    if ($(this).val()=='') return
    $('#group-list option:hidden').removeClass('hidden')
    $('#ed-owner').val($(this).val()).change()
    $(this).slideUp('slow')
  })
  $('#intro-n').click(function(){
    var cv=$('.intro-t:visible'), woi=cv.index()
    if(woi==$('.intro-t').last().index()){
      if(typeof(g_Settings['bw_cap'])=='undefined'||(_unlimited_usage==1 && typeof(g_Settings['bonus_cap'])=='undefined')){
        alert('You have not properly specified your bandwidth cap info!')
        $('.req-settings').show().siblings('.intro-t').hide()
        $('#intro-n').text('Next >>')
        return false
      }
      updateSettings('complete',1)
      saveSettings(false)
      if (typeof(_dbkey)!='undefined') saveSettings2db(true)
      alert("Congratulations, you've completed the reports setup.  The page will now reload.")
      window.location.reload()
      return false
    }
    var no=cv.next('.intro-t'), noi=no.index(), loi=$('.intro-t').last().index()
    $('#intro-p')[(noi==0)?'hide':'show']()
    $('#intro-n').text(noi==loi?'Finish':'Next >>')
    cv.hide()
    no.fadeIn(1500)
  })
  $('#intro-p').click(function(){
    var cv=$('.intro-t:visible'), woi=cv.index()
    var po=cv.prev('.intro-t')
    $('#intro-p')[(woi==1)?'hide':'show']()
    $('#intro-n').text(cv.prev('.intro-t').index()==$('.intro-t').last().index()?'Finish':'Next >>')
    cv.hide()
    po.fadeIn(1500)
  })
}
function setUpLiveCharts(){
  if (!google.visualization||!google.visualization.LineChart){
    console.log('Error - google.visualization.LineChart not loaded')
    return false
  }

  livekbs_do_chart=new google.visualization.LineChart(document.getElementById('livekbs-do-graph'))
  livekbs_up_chart=new google.visualization.LineChart(document.getElementById('livekbs-up-graph'))
  sl_chart=new google.visualization.LineChart(document.getElementById('sl-graph'))
  setLiveUpdates()
}
function clean(n){
  return n.toLowerCase().replace(' ','_').replace(/\W/g,"")
}
function byGN(a,b) {
  var n1=devices[a].group.toLowerCase()
  var n2=devices[b].group.toLowerCase()
  return ((n1<n2)?-1:((n1>n2)?1:byDevice2(a,b)));
}
function byName(a,b) {
  var n1=devices[a].group.toLowerCase()
  var n2=devices[b].group.toLowerCase()
  return ((n1<n2)?-1:((n1>n2)?1:byDevice(a,b)));
}
function byDevice(a,b) {
  var d1=devices[a].name.toLowerCase()
  var d2=devices[b].name.toLowerCase()
  return ((d1<d2)?-1:((d1>d2)?1:0));
}
function byDevice2(a,b) {
  var d1=devices[a].name.toLowerCase()
  var d2=devices[b].name.toLowerCase()
  return ((d1<d2)?1:((d1>d2)?-1:0));
}
function byDate(a,b) {
  return ((a<b)?1:((a>b)?-1:0));
}
function byGMTot(a,b) {
  var n1=names[a].down+names[a].up
  var n2=names[b].down+names[b].up
  return ((n1<n2)?1:((n1>n2)?-1:0));
}
function byMMTot(a,b) {
  var n1=monthly[a].down+monthly[a].up
  var n2=monthly[b].down+monthly[b].up
  return ((n1<n2)?1:((n1>n2)?-1:0));
}
function byHTot(a,b) {
  var n1=hourly[a].down+hourly[a].up
  var n2=hourly[b].down+hourly[b].up
  return ((n1<n2)?1:((n1>n2)?-1:0));
}
function byIP(a,b) {
  var n1=a[1]
  var n2=b[1]
  return ((n1<n2)?-1:((n1>n2)?1:0));
}
function updateSettings(k,v){
  g_Settings[k]=v
  localStorage.setItem('YAMon3-Settings',JSON.stringify(g_Settings))
}
function saveSettings(sa){
  var ss=JSON.stringify(g_Settings)
  localStorage.setItem('YAMon3-Settings',ss)
  if(typeof(_dbkey)!='undefined'){
    $('#sv-btn').fadeIn('slow').addClass('visible')
    $('#settings-tab').addClass('sv-req')
  }
  if(g_Settings.autoSave){
    saveSettings2db(sa)
  }
}
function saveSettings2db(sa){
  if(typeof(sa)==undefined) sa=true
  var ss=JSON.stringify(g_Settings)
  if(typeof(_dbkey)=='undefined') return
  if(sa) showLoading('Saving Settings to database...')
  var request=$.ajax({
    url: domain+"db/svSettings.php",
    type: "POST",
    data: { db : _dbkey,settings:ss },
    dataType: "json",
    cache: false
  });
  request.done(function( data ) {
    if (data.response=='success') {
      $('#sv-btn').fadeOut('slow').removeClass('visible')
      $('.sv-req').removeClass('sv-req')
    }
    else if (data.response=='error') {
      alert( data.comment );
    }
    if(sa) clearLoading()
  });
  request.fail(function(jqXHR, textStatus, errorThrown){
    if(confirm("Saving your updated settings to the database failed with error message: " + textStatus +":  " +  errorThrown +"?!?\n\nClick `OK` to save again or `Cancel`")){
      saveSettings2db(sa)
    }
  });
}
function saveIPs(){
  g_IPs['dirty']=false
  localStorage.setItem('IPs',JSON.stringify(g_IPs))
}
function refreshTimerFunc(){
  function countTo(t,d){
    var nv=$("#sp-freeMem").text()*1+d
    $("#sp-freeMem").text(nv)
    if(nv>=t){
      clearInterval(c2timer)
    }
  }
  var c2timer
  $(".RefreshInterval").text($(".RefreshInterval").text()*1-1);
  if ($(".RefreshInterval").text()==0){
    $('#daily-tab').removeClass('loaded')
    var hourlyLoaded = loadHourly()
    hourlyLoaded.done(function(){
      //do nothing!
    });
    var dfm=freeMem*1-$("#sp-freeMem").text()*1
    if(dfm!=0){
      c2timer=setInterval(function() { countTo(freeMem,dfm>0?1:-1)},1000*_updatefreq/Math.abs(dfm*1.333))
    }
    $(".RefreshInterval").text($("#RefreshInterval").val());
  }
}
function changeUnits(wo){
  var ct=$(wo).text().toLowerCase()
  var ns=ct=='auto'?ct:2
  $('#displayUnits').val(ns).change()
  $('.change-units a').addClass('hidden');
  $('.change-units a')[$('#displayUnits').val()=='auto'?'first':'last']().removeClass('hidden')
}
function displayBytes(range){
  var cells= $(range).find('.num');
  var baseIndex=$('#displayUnits option:selected').index()-1, unitsIndex
  $(cells).removeClass('isNull bytes Kbytes MBytes GBytes TBytes PBytes negative');
  var cell_val='N/A';
  var units='',isneg=''
  $(cells).each(function(){
    var bytes=$(this).data('value')*1;
    if($(this).hasClass('percent')){
      $(this).text(bytes)
      return
    }
    else if (bytes==0){
      $(this).text(0).addClass('bytes')
      return
    }
    else if (isNaN(bytes)){
      $(this).text('-').addClass('isNull')
      return
    }
    unitsIndex=baseIndex<0?Math.floor((Math.log(Math.abs(bytes)))/Math.log(g_base)):baseIndex
    cell_val=(bytes/Math.pow(g_base,Math.floor(unitsIndex))).toFixed(_dec);
    units=dispUnits[unitsIndex]+'ytes';
    isneg=cell_val<0?' negative':'';
    $(this).text(cell_val).addClass(units+isneg);
  })
}
function hiddenDevices(){
  var sd=$('#ShowHiddenDevices').is(':checked')
  $('#devicesData tr.odd').removeClass('odd')
  $('#devicesData .hidden-device')[sd?'show':'hide']()
  $('#devicesData tr:visible:odd').addClass('odd')
}
function showHideDevices(){
  var sz=$('#ShowZeroes').is(':checked')
  var sd=$('#ShowDevices').is(':checked')
  $('.is_d').each(function(){
    var bytes=$(this).find('.tByts').data('value');
    var is_z=(bytes==0)||(bytes=='-');
    var is_v=!$(this).hasClass('hidden')
    if(!sd){
      $(this).addClass('hidden')
    }
    else if (is_z&&sz&&!is_v) {
      $(this).removeClass('hidden')
    }
    else if(is_z&&!sz&&is_v){
      $(this).addClass('hidden').addClass('is_z')
    }
    else if(!is_z&&!is_v){
      $(this).removeClass('hidden')
    }
  })
  $('.is_dd,.is_u').each(function(){
    var bytes=$(this).find('.tByts').data('value');
    var is_z=(bytes==0)||(bytes=='-');
    var is_v=!$(this).hasClass('hidden')
    if (is_z&&sz&&!is_v) {
      $(this).removeClass('hidden')
    }
    else if(is_z&&!sz&&is_v){
      $(this).addClass('hidden')
    }
    else if(!is_z&&!is_v){
      $(this).removeClass('hidden')
    }
  })
  $('.u-d').removeClass('c-u c-d').addClass(sd?'c-d':'c-u')
  $('.item-e')[sd?'removeClass':'addClass']('item-c');
  $('.is-cap')[g_nobwCap?'hide':'show']()
  $('#correction-row')[$('.cf-desc').val()==''&&$('#correction-row .tByts').data('value')==0?'hide':'show']()
  $('#mcorrection-row')[$('#mcorrection-row .tByts').hasClass('isNull')?'hide':'show']()
  $('.loaded tr.odd').removeClass('odd')
  $('.loaded tr:visible:odd').addClass('odd')
  $('.loaded .is_u').removeClass('odd')
}
function lastmod(du,da){
  if(!du) return 'Unknown???'
  if(du==da) return '-'
  var dd=du.split(' '),ymd=dd[0].split('-'),hms=dd[1].split(':'),du2=(new Date(ymd[0],ymd[1]-1,ymd[2],hms[0],hms[1],hms[2]))
  var dis=Math.floor(((new Date()).valueOf()-du2.valueOf())/1000)
  return sec2text(dis,'h')+ " ago";
}
function sec2text(dis,fmt){
  var d=Math.floor(dis/86400)+'d ',h=(Math.floor(((dis/86400)%1)*24))+'h ',m=(Math.floor(((dis/3600)%1)*60))+'m ',s=(Math.round(((dis/60)%1)*60))+'s'
  if(d=='0d ')d=''
  if(d==''&&h=='0h '||fmt=='d')h=''
  if(d+h==''&&m=='0m '||(fmt=='h'&&d+h!=''))m=''
  if(d+h==''&&s=='0s '||(fmt=='h'&&d+h!=''))s=''
  return(d+h+m+s)
}
function flushChanges(){
  $('.num').attr('title','').removeClass('changed c0 c1 c2 c3 c4 c5');
}
function setPercents(rows,tot){
  var ctot=0
  $(rows).each(function(){
    var dt=$(this).find('.tByts').data('value');
    var dp=(isNaN(dt)?0:dt*1)/tot*100
    ctot+=($(this).hasClass('is_d')||$(this).hasClass('is_dd')||$(this).attr('id')=='correction-row'||$(this).attr('id')=='mcorrection-row'?dp:0)
    dp=(dp > 0.1)? dp.toFixed(_dec):"-";
    var pcu=(dp>100&&"over-cap"||dp>90&&"cap-90"||dp>80&&"cap-80"||dp>40&&"cap-40"||'cap-ok')
    $(this).find('.percent').text(dp).removeClass('over-cap cap-90 cap-80 cap-40 cap-ok').addClass(pcu)
  })
  $(rows).parents('table').find('.ftotals .percent').text(ctot.toFixed(_dec))
}
function zeroDevicesTotal(){
  Object.keys(names).forEach(function(k){
    names[k].up=0
    names[k].down=0
    names[k].ul_up=0
    names[k].ul_down=0
  })
}
function zeroMonthlyTotals(){
  if(_unlimited_usage=='0'){
    monthly_totals={down:0,up:0,usage:[],pnd:[]}
    for(var x=1;x<32;x++){
      monthly_totals.usage[x]={down:0,up:0}
      monthly_totals.pnd[x]={down:0,up:0,reboots:0}
    }
  }
  else{
    monthly_totals={down:0,up:0,ul_down:0,ul_up:0,usage:[],pnd:[]}
    for(var x=1;x<32;x++){
      monthly_totals.usage[x]={down:0,up:0,ul_down:0,ul_up:0}
      monthly_totals.pnd[x]={down:0,up:0,ul_down:0,ul_up:0,reboots:0}
    }
  }
}
function updateRow(did,arr){
  if(arr[0][1]+arr[1][1]>0)$('#'+did).removeClass('clear').slideDown('slow')
  arr.forEach(function(i){
    updateValue('#'+did+i[0],i[1])
  })
}
function updateValue(vid,v){
  if(isNaN($(vid).data('value'))||$(vid).data('value')==0){
    $(vid).data('value',v)
    return
  }
  var delta=v-($(vid).data('value')||0)
  if(delta<=0) return
  if($(vid).hasClass('percent')){
    $(vid).text(v)
    $(vid)[v<0?'addClass':'removeClass']('negative')
    return
  }
  var deltaIndex=Math.floor(Math.log(Math.abs(delta))/Math.log(g_base));
  var delta_val=(delta/Math.pow(g_base,Math.floor(deltaIndex))).toFixed(_dec);
  var units=dispUnits[deltaIndex]+'ytes';
  var nstars=Math.floor(Math.log(delta)/Math.log(g_base));
  var msg='delta: '+delta_val + ' ' + units
  $(vid).data('value',v).attr('title',msg)
  if($(vid).parents('tr').hasClass('is_d'))$(vid).addClass('changed c'+nstars)
}
function ShowDevices(sh){
  if(sh=='all' || sh=='none'){
    $('#DailyData .legend-colour, #hourly-tbody .legend-colour').each(function(){
      $(this)[sh=='all'?'removeClass':'addClass']('op10')
      $(this).next()[sh=='all'?'removeClass':'addClass']('so')
    })
  }
  else{
    $('#DailyData .legend-colour, #hourly-tbody .legend-colour').each(function(){
      var ishidden=($(this).parents('tr').data('group').toLowerCase()==sh)
      $(this)[ishidden?'removeClass':'addClass']('op10')
      $(this).next()[ishidden?'removeClass':'addClass']('so')
    })
  }
  if ($('#daily-tab-section').is(':visible')){
    DrawPie('Daily')
    DrawHourlyGraph()
  }
}
function DrawHourlyGraph(){
  if($('#DailyData .legend-colour:visible').not('.op10').length==0){
    $('#hourlyGraph').html("<h2>Hourly Graph: No devices are selected in the table above</h2>")
    $('#hourlyDiffGraph').html("<h2>Hourly Differences Graph: No devices are selected in the table above</h2>")
    $('#bnav').hide()
    set_h_sd()
    return
  }
  $('#bnav').fadeIn()
  var inKbytes=true
  var hdata=new google.visualization.DataTable()
  var colours=[],gseries=[]
  hdata.addColumn('string','Name');
  $('#DailyData .legend-colour:visible').not('.op10').each(function(){
    var mac=$(this).parents('tr').data('mac')
    hdata.addColumn('number',devices[mac].group+'-'+devices[mac].name)
    var tcolour=devices[mac].colour==''?colours_list[devices[mac].n%n_colours]:devices[mac].colour
    colours.push(tcolour)
    var thisbytes=$(this).parents('tr').find('.tByts').hasClass('Kbytes')||$(this).parents('tr').find('.tByts').hasClass('bytes')
    inKbytes=inKbytes&&thisbytes
    gseries.push({color:tcolour,type:'column',visibleInLegend:true,targetAxisIndex:0})
  })
  set_h_sd()
  var show_pnd=$('#ShowRD').is(':checked')&&$('#h_sd').hasClass('checked')
  if(show_pnd){
    var diffdata=new google.visualization.DataTable(),dseries=[]
    hdata.addColumn('number','Measured @ Router')
    gseries.push({lineWidth:3,color:'#8C0000',type:'line',visibleInLegend:true,targetAxisIndex:0})
    $('#hourlyDiffGraph').show()
    diffdata.addColumn('string','Name')
    diffdata.addColumn('number','Download Differences')
    diffdata.addColumn('number','Upload Differences')
    diffdata.addColumn('number','Cummulative Download %')
    diffdata.addColumn('number','Cummulative Upload %')
    diffdata.addColumn('number','Combined Differences')
    dseries.push({lineWidth:1,color:'#659ec7',type:'line',lineDashStyle:[2,1],visibleInLegend:true,targetAxisIndex:0})
    dseries.push({lineWidth:1,color:'#2554c7',type:'line',visibleInLegend:true,targetAxisIndex:0})
    dseries.push({lineWidth:1,color:'#800000',type:'line',lineDashStyle: [2,1],visibleInLegend:true,targetAxisIndex:1})
    dseries.push({lineWidth:1,color:'#c11b17',type:'line',visibleInLegend:true,targetAxisIndex:1})
    dseries.push({lineWidth:1,color:'black',type:'line',visibleInLegend:true,targetAxisIndex:1})
  }
  else{
    $('#hourlyDiffGraph').hide()
  }
  var rd=null,c_pnd_d=0,c_pnd_u=0,c_int_d=0,c_int_u=0
  for(var x=0;x<24;x++){
    var pnd_d=0,pnd_u=0
    if(!show_pnd||!pnd_data||!pnd_data.usage||!pnd_data.usage[x]){
      rd=null
    }
    else{
      pnd_d=pnd_data.usage[x].down
      pnd_u=pnd_data.usage[x].up
      rd=pnd_data.usage[x].down+pnd_data.usage[x].up
    }
    c_pnd_d+=pnd_d
    c_pnd_u+=pnd_u
    var hr=twod(x),vv=[hr],diff_row=[],int_d=0,int_u=0
    diff_row.push(hr)
    $('#DailyData .legend-colour:visible').not('.op10').each(function(){
      var mac=$(this).parents('tr').data('mac')
      vv.push(1*((hourly[mac].usage[x].down*1+hourly[mac].usage[x].up*1)/(inKbytes?g_toKB:g_toMB)).toFixed(_dec))
      int_d+=hourly[mac].usage[x].down*1
      int_u+=hourly[mac].usage[x].up*1
    })
    c_int_d+=int_d
    c_int_u+=int_u
    if(show_pnd){
      vv.push(1*((rd*1)/(inKbytes?g_toKB:g_toMB)).toFixed(_dec))
      diff_row.push(int_d==0?null:1*((pnd_d-int_d)/g_toMB).toFixed(_dec))
      diff_row.push(int_u==0?null:1*((pnd_u-int_u)/g_toMB).toFixed(_dec))
      diff_row.push(int_d==0?null:1*((c_pnd_d-c_int_d)/c_int_d*100).toFixed(_dec))
      diff_row.push(int_u==0?null:1*((c_pnd_u-c_int_u)/c_int_u*100).toFixed(_dec))
      diff_row.push(int_d==0?null:1*((c_pnd_d+c_pnd_u-c_int_d-c_int_u)/(c_int_d+c_int_u)*100).toFixed(_dec))
      diffdata.addRow(diff_row)
    }
    hdata.addRow(vv);
  }
  var baroptions={width:maxGrWidth,height:400,title:'Hourly Totals',legend:{position:'right',textStyle: {color: 'black',fontSize: 10}},chartArea:{},isStacked:true,is3D:true,hAxis:{title:'Hour of the Day - '+$('.current-date').first().text(),slantedText:false,titleTextStyle:{color:'green'},textStyle:{fontSize:11}},vAxis:{title:'Total Usage in '+(inKbytes?'kB':'MB'),titleTextStyle:{color:'green'}},series:{}}
  baroptions.colors=colours
  var hourlychart=new google.visualization.ColumnChart(document.getElementById('hourlyGraph'))
  baroptions['series']=gseries
  hourlychart.draw(hdata,baroptions)
  if (show_pnd){
    var hourlydiffchart=new google.visualization.ColumnChart(document.getElementById('hourlyDiffGraph'))
    var diffoptions={width:maxGrWidth,height:400,title:'Hourly Differences between Measured @ Router & YAMon',series:{},legend:{position:'bottom',textStyle:{fontSize:8}},hAxis:{title:'Hour of the Day - '+$('.current-date').first().text(),slantedText:false,titleTextStyle:{color:'green'},textStyle:{fontSize:11}},vAxes:{0:{title:'Differences (in MB)',titleTextStyle:{color:'blue'}},1:{title:'Cummulative Differences (in %)',titleTextStyle:{color:'#800000'}}}}
    diffoptions['series']=dseries
    hourlydiffchart.draw(diffdata,diffoptions)
  }
}
function DrawMonthlybyDeviceGraph(){
  var ddata=new google.visualization.DataTable()
  var colours=[],ocolours=[],gseries=[],oseries=[]
  ddata.addColumn('string','Name');
  $('#MonthlyData .is_d').each(function(){
    var mac=$(this).data('mac')
    ddata.addColumn('number',devices[mac].group+'-'+devices[mac].name)
    var tcolour=devices[mac].colour==''?colours_list[devices[mac].n%n_colours]:devices[mac].colour
    colours.push(tcolour)
    gseries.push({color:tcolour,type:'column',visibleInLegend:true,targetAxisIndex:0})
  })
  var odata=new google.visualization.DataTable()
  odata.addColumn('string','Name');
  var lnl=[]
  $($('#MonthlyData .is_u').get().reverse()).each(function(){
    var owner=$(this).data('g-n'),pct=$(this).find('.percent').text()
    if(pct=='-') return
    lnl[owner]=0
    odata.addColumn('number',names[owner].group+' - '+(pct=='-'?0:pct)+'%' )
    var tcolour=colours_list[(names[owner].n+64)%n_colours]
    ocolours.push(tcolour)
  })
  var dism=new Date(_rs_Date.getFullYear(),_rs_Date.getMonth()*1+1,0).getDate()
  for(var x=_ispBillingDay;x<=dism;x++){
    var vv=[twod(x)],od=[twod(x)]
    $('#MonthlyData .is_d').each(function(){
      var mac=$(this).data('mac'),owner=$(this).data('g-n').split('-')[0]
      var trfc=!monthly[mac]?null:1*((monthly[mac].usage[x].down*1+monthly[mac].usage[x].up*1)/g_toMB).toFixed(_dec) || null
      lnl[owner]+=trfc
      vv.push(trfc)
    })
    ddata.addRow(vv);
    $($('#MonthlyData .is_u').get().reverse()).each(function(){
      var owner=$(this).data('g-n'),pct=$(this).find('.percent').text()
      if(pct=='-') return
      od.push(1*(lnl[owner]/1024).toFixed(_dec))
    })
    odata.addRow(od)
  }
  for(var x=1;x<_ispBillingDay;x++){
    var vv=[twod(x)],od=[twod(x)]
    $('#MonthlyData .is_d').each(function(){
      var mac=$(this).data('mac'),owner=$(this).data('g-n').split('-')[0]
      var trfc=trfc=!monthly[mac]?null:1*((monthly[mac].usage[x].down*1+monthly[mac].usage[x].up*1)/g_toMB).toFixed(_dec)
      lnl[owner]+=trfc
      vv.push(trfc)
    })
    ddata.addRow(vv);
    $($('#MonthlyData .is_u').get().reverse()).each(function(){
      var owner=$(this).data('g-n'),pct=$(this).find('.percent').text()
      if(pct=='-') return
      od.push(1*(lnl[owner]/1024).toFixed(_dec))
    })
    odata.addRow(od)
  }
  if($('#MonthlyGraphbyDevice').length==0){
    $('#monthly-tab-section .main-section').after("<div id='MonthlyGraphbyDevice'/>")
  }
  var devicechart=new google.visualization.ColumnChart(document.getElementById('MonthlyGraphbyDevice'))
  var d_options={width:maxGrWidth,height:400,title:'Daily Totals by Device',legend:{position:'right',textStyle:{fontSize:8}},chartArea:{},isStacked:true,is3D:true,hAxis:{title:$(".current-interval").first().text(),slantedText:true,titleTextStyle:{color:'green'},textStyle:{fontSize:7}},vAxis:{title:'Total Usage in MB',titleTextStyle:{color:'green'}},series:{}}
  d_options.colors=colours
  d_options['series']=gseries
  devicechart.draw(ddata,d_options)
  if($('#MonthlyGraphbyOwner').length==0){
    $('#MonthlyGraphbyDevice').after("<div id='MonthlyGraphbyOwner'/>")
  }
  var ownerchart=new google.visualization.AreaChart(document.getElementById('MonthlyGraphbyOwner'))
  var o_options={width:maxGrWidth,height:400,title:'Cummulative Monthly Totals by Owner',legend:{position:'right',textStyle:{fontSize:11}},chartArea:{},isStacked:true,is3D:true,hAxis:{title:$(".current-interval").first().text(),slantedText:true,titleTextStyle:{color:'green'},textStyle:{fontSize:7}},vAxis:{title:'Total Usage in GB',titleTextStyle:{color:'green'}},series:{}}
  o_options.colors=ocolours
  ownerchart.draw(odata,o_options)
}
function set_h_sd(){
  var c_hd=$('#DailyData .op10').length,n_tot=$('#DailyData .is_d').not('.is_z').length,n_vis=$('#DailyData .is_d:visible').length
  if(n_tot==n_vis&&c_hd==0){
    $('#h_sd').removeClass('partial').addClass('checked');
    $('.h_fd').removeClass('fd-sel fd-some')
    $('#h_fd-all').addClass('fd-sel')
  }
  else if(c_hd==$('#DailyData .legend-colour').length||n_vis==0){
    $('#h_sd').removeClass('partial checked');
    $('.h_fd').removeClass('fd-sel fd-some')
    $('#h_fd-none').addClass('fd-sel')
  }
  else{
    $('#h_sd').removeClass('checked').addClass('partial');
    $('.h_fd').each(function(){
      var un=$(this).text()
      var ni=$(".is_d[group='"+un+"']").length,nd=$("#DailyData .is_d[group='"+un+"'] .op10").length
      if(ni==0) return;
      if(nd==0){
        $(this).removeClass('fd-some').addClass('fd-sel')
      }
      else if(nd==ni){
        $(this).removeClass('fd-sel fd-some')
      }
      else{
        $(this).removeClass('fd-sel').addClass('fd-some')
      }
    })
  }
}
function DrawCandle(){
  $('#hourlyLoadGraph').html('coming soon...')
  if(hourlyloads.length==0) return
  var nx=[],hr,row, dd
  for(var x=0;x<24;x++){
    hr=twod(x)
    row=[]
    if(!hourlyloads[hr])
      row.push(hr, null, null, null, null)
    else{
      var tv = hourlyloads[hr].split(',')
      row.push(hr, tv[0]*1, tv[1]*1, tv[2]*1, tv[3]*1)
    }
    nx.push(row)
     }
  var data = google.visualization.arrayToDataTable(nx, true);
  var options = {
  height:400,width:maxGrWidth,legend:'none',title:'Hourly Max/Min Server Loads (1-min & 5-min)',hAxis:{title:'Hour of the Day - '+$('.current-date').first().text(),slantedText:false,titleTextStyle:{color:'green'},textStyle:{fontSize:11}},vAxes:{0:{title:'Server Load Range',titleTextStyle:{color:'blue'}}}
  };
  var chart = new google.visualization.CandlestickChart(document.getElementById('hourlyLoadGraph'));
  chart.draw(data, options);
}
function DrawPie(m_d){
  var rn=0;
  var ch_title=(m_d=='Unlimited')
    ?('Usage by Group and/or Device during\n`Bonus Data` interval (i.e.,between '+_unlimited_start+' - '+_unlimited_end+')')
    :(_unlimited_usage=='1'
      ?(m_d+' Usage by Group and/or Device\n(' + ($('#ul-redtot').is(':checked')?'less':'including') + ' `Bonus Data` usage between '+_unlimited_start+' - '+_unlimited_end+')')
      :('Usage by Group and/or Device')
    )
  var options={title: ch_title,is3D:true,slices:{},colors:{},chartArea:{left:48,height:250,width:300},legend:{alignment:'center',position: 'right',textStyle: {color: 'black',fontSize: 10}}}
  var data,datarows=[],devicecolours=[],tmp,mac
  var showexploded=false
  var colours=[]
  var wt=(m_d=='Unlimited')?'Monthly':m_d
  data=new google.visualization.DataTable();
  data.addColumn('string','Group/Device');
  data.addColumn('number','MB Used');
  $('#'+wt+'Data tr').not('.hidden').each(function(){
    if($(this).hasClass('is_u')&&$(this).find('.item-e.item-c').length==0){
      return;
    }
    if($(this).hasClass('is_u')){
      showexploded=true
      var pn=$(this).find('.userName').text(),n=$(this).data('g-n'),tc=colours_list[(names[n].n+64)%n_colours]
      colours.push(tc)
      $('#gp-'+n).find('.item-e').css('backgroundColor',tc)
      $('#mgp-'+n).find('.item-e').css('backgroundColor',tc)
    }
    else if($(this).hasClass('is_d')){
      if ($(this).find("span").hasClass("op10")) return true
      var pn=$(this).data('group')+'-'+$(this).find('.thedevice').text()
      options.slices[rn]={offset:0.14}
      var tmp=$(this).find('.deviceName').attr('title').split('|');
      var mac=tmp[0].trim().toUpperCase();
      var tcolour=devices[mac].colour==''?colours_list[devices[mac].n%n_colours]:devices[mac].colour
      colours.push(tcolour)
    }
    var ca=(((m_d=='Unlimited')?$(this).find('.ul-down').data('value')*1+$(this).find('.ul-up').data('value')*1:$(this).find('.tByts').data('value'))/g_toMB).toFixed(_dec)
    datarows.push([pn,Math.max(ca*1,0)])
    rn++
  })
  if((m_d=='Daily') && ($('#correction-row .tByts ').data('value')!=0)){
    var ca=($('#correction-row .tByts ').data('value')/g_toMB).toFixed(_dec)
    datarows.push(['Corrections',Math.max(ca*1,0)])
    colours.push('black')
  }
  else if((m_d=='Monthly') && ($('#mcorrection-row .tByts ').data('value')!=0)){
    var ca=($('#mcorrection-row .tByts ').data('value')/g_toMB).toFixed(_dec)
    datarows.push(['Corrections',Math.max(ca*1,0)])
    colours.push('black')
  }
  data.addRows(datarows);
  $('#'+m_d+'Graph').hasClass('hidden') && $('#'+m_d+'Graph').show()
  var ChartObj=new google.visualization.PieChart(document.getElementById(m_d+'Graph'));
  if(!showexploded){
    Object.keys(options.slices).forEach(function(k){
      options.slices[k].offset=0;
    })
  }
  options.colors=colours
  ChartObj.draw(data,options);
}
function changelegend(){
  $('#changes-legend')[$('table .changed').length==0?'slideUp':'slideDown']('slow')
  $('#changes-legend .c0')[$('table .changed.c0').length==0?'hide':'show']()
  $('#changes-legend .c1')[$('table .changed.c1').length==0?'hide':'show']()
  $('#changes-legend .c2')[$('table .changed.c2').length==0?'hide':'show']()
  $('#changes-legend .c3')[$('table .changed.c3').length==0?'hide':'show']()
  $('#changes-legend .c4')[$('table .changed.c4').length==0?'hide':'show']()
  $('#changes-legend .c5')[$('table .changed.c5').length==0?'hide':'show']()
}
function changeTotals(wt){
  var ul_redtot=$('#ul-redtot').is(':checked')?1:0,
  total=0
  $('#'+wt+'Data tr').each(function(){
    var rid=$(this).attr('id')
    var down=$(this).find('.downloads').data('value')*1,
    up=$(this).find('.uploads').data('value')*1,
    ul_down=$(this).find('.ul-down').data('value')*1,
    ul_up=$(this).find('.ul-up').data('value')*1,
    ut=up+down-(ul_up+ul_down)*ul_redtot
    total+=ut*$(this).hasClass('is_d')
    updateRow(rid,[' .tByts',ut])
  })
  updateRow(wt+'Footer',[' .tByts',total])
  setPercents('#'+wt+'Data tr,#'+wt+'-correction-row',total)
  displayBytes('#'+wt+'-usage-table');
  DrawPie(wt)
}
function ShowAlert(msg,tcl, sh){
  $('.alert-icon').fadeIn('slow')
  if($('#myAlert .'+tcl).html()==msg){
    return
  }
  if(typeof(tcl)!='undefined') $('.'+tcl).remove()
  $('#myAlert-body').append("<div class='alert-msg "+tcl+" not-viewed'>"+msg+"</div>")
  if(sh) $('#myAlert').show()
}
function removecorrection(){
  if(confirm('Are you sure you want to delete the correction for this date?')){
    $('#cf-desc, #cf-d, #cf-u').val('').change()
    $('#correction-row,#remove-correction').slideUp('slow')
    $('#DailyFooter')[$('#DailyData tr').length==0?'slideUp':'slideDown']('slow')
  }
}
function newdate(d,o){
  return new Date(d.getFullYear(),d.getMonth(),d.getDate()+o);
}
function deleteSummaryEntry(i) {
  if(confirm('Are you sure you want to delete this history entry?\nThis will also reload the data.')){
    if($('#'+i).hasClass('currentSummary')) $('#'+i).prev('.summary-row').find('.interval').click()
    $('#'+i).remove()
    delete g_Settings['summaries'][i]
    UsageHistoryChart()
    saveSettings()
  }
}
function clearLoading(td){
  if(!td) td=1500
  if($('#splash').is(':visible')){
    $('.loading-wrapper h1').delay(td/2).fadeOut(td/2);
    $('.loading-wrapper, #splash').delay(td).fadeOut(td);
  }
  else{
    $('.loading-wrapper').delay(td).fadeOut(td/3);
  }
}
function showLoading(msg){
  if($('#SuppressUpdates').is(':checked') ) return false
  $('.loading h1').text(msg)
  $('.loading-wrapper, .loading-wrapper h1').fadeIn(500)
}
function settings(wo){
  if(wo=='reset'){
    if(!confirm('Are you sure that you want to clear all localStorage variables stored for YAMon?')){
      return
    }
    localStorage.removeItem('YAMon3-Settings')
    return
  }
  $('#settings').find('.s-export, .s-import, .s-isp').hide()
  $('#settings textarea.s-export').val('')
  $('#settings,.dlog-close,.s-'+wo).slideDown('slow')
  if(wo=='export'){
    var ts=JSON.stringify(localStorage)
    $('#settings textarea.s-export').val(ts).select()
  }
}
function close_settings(){
  $('#isp-in').val('')
  $('#isp-out').val('').slideUp('slow')
  $('#isp-import-results').removeClass('oops').html('').hide()
  $('#settings').slideUp('slow')
}
function import_settings(){
  if(!confirm("Are you sure you want to do this?  Have you already backed up the settings from this machine (by exporting them)?\n\nRemember that you cannot undo this operation without a backup... you've been warned!  Click `Cancel` to chicken out.")){
    close_settings()
    return false
  }
  if ($('#settings textarea').val()==''){
    ShowAlert('<p>There is nothing to import?!?</p>','import')
    return
  }
  var nv=JSON.parse($('#settings textarea').val())
  Object.keys(nv).forEach(function(k){
    localStorage.setItem(k,nv[k])
  })
  saveSettings2db(true)
  location.reload();
}
function drawGraphs(){
  if(!$('#monthly-breakdown-tab-section').is(':visible')) return
  var mbfs=$('#mb-filter :selected'),un=$(mbfs).val(),dn=$(mbfs).text()
  if(un=='ALL'){
    var gr4='All Devices for All Users'
  }
  else if($(mbfs).hasClass('ddl-u')){
    var gr4='All Devices for Group: `'+dn+'`'
  }
  else{
    var gp=$(mbfs).data('gp')
    var gr4='Device: `'+dn+'` for Group: `'+gp+'`'
  }
  $('#graphsfor').text(gr4)
  $('.gr-nall')[un=='ALL'&&($('#showISP').is(':checked')||$('#ShowRD').is(':checked'))?'show':'hide']()
  var bd_graphs=g_Settings['graphs']
  Object.keys(bd_graphs).forEach(function(k){
    DrawGraph(k)
  })
}
function DrawGraph(wg){
  function SetDiffCols(s){
    if(inc_rd){
      graph_data.addColumn('number','Router Down');
      graph_data.addColumn('number','Router Up');
      graph_data.addColumn('number','Router Total');
      s.push({lineWidth:1,color:'#659ec7',lineDashStyle:[2,1],type:'line',visibleInLegend:true,targetAxisIndex:0})
      s.push({lineWidth:1,color:'#800000',lineDashStyle:[2,1],type:'line',visibleInLegend:true,targetAxisIndex:0})
      s.push({lineWidth:1,color:'green',type:'line',visibleInLegend:true,targetAxisIndex:0})
    }
    if(inc_isp){
      graph_data.addColumn('number',ispname+' Down');
      graph_data.addColumn('number',ispname+' Up');
      graph_data.addColumn('number',ispname+' Total');
      s.push({lineWidth:1,color:'#2554c7',lineDashStyle:[2,1],type:'line',visibleInLegend:true,targetAxisIndex:0})
      s.push({lineWidth:1,color:'#c11b17',lineDashStyle:[2,1],type:'line',visibleInLegend:true,targetAxisIndex:0})
      s.push({lineWidth:1,color:'red',type:'line',visibleInLegend:true,targetAxisIndex:0})
    }
  }
  function SetCols(s){
    if(inc_rd){
      graph_data.addColumn('number','Router');
      s.push({lineWidth:1,color:'green',type:'line',visibleInLegend:true,targetAxisIndex:0})
    }
    if(inc_isp){
      graph_data.addColumn('number',ispname);
      s.push({lineWidth:1,color:'red',type:'line',visibleInLegend:true,targetAxisIndex:0})
    }
  }
  function GetDownloadGraphData(){
    var gr_scale=setGraphScale('downloads'),series=[]
    var sc=gr_scales[gr_scale]||g_toKB
    options['title']+=' (in '+gr_scale+')'
    options['vAxes'][0]['title']+='Downloads (in '+gr_scale+')'
    graph_data.addColumn('number','YAMon - Downloads');
    series.push({color:yd_colour,type:'column',visibleInLegend:true,targetAxisIndex:0})
    SetCols(series)
    var rdv=0,ispv=0
    $('.mb-row').each(function(){
      var dn=$(this).attr('id').split('-')[3]*1
      var row_data=[]
      row_data.push(($(this).find('.mbd-date').hasClass('flagged')?'* ':'')+dn)
      row_data.push(((!dataset[dn]?0:dataset[dn].down)/sc).toFixed(_dec)*1)
      if(inc_rd){
        rdv=!monthly_totals.pnd[dn]?null:((monthly_totals.pnd[dn].down/sc).toFixed(_dec)*1)
        row_data.push(rdv==0?null:rdv)
      }
      if(inc_isp){
        ispv=!isp_totals[dn]?null:((isp_totals[dn].down/sc).toFixed(_dec)*1)
        row_data.push(ispv)
      }
      graph_data.addRow(row_data)
    })
    options['series']=series
  }
  function GetUploadGraphData(){
    var gr_scale=setGraphScale('uploads'),series=[]
    var sc=gr_scales[gr_scale]||g_toKB
    options['title']+=' (in '+gr_scale+')'
    options['vAxes'][0]['title']+='Uploads (in '+gr_scale+')'
    graph_data.addColumn('number','YAMon - Uploads');
    series.push({color:yu_colour,type:'column',visibleInLegend:true,targetAxisIndex:0})
    SetCols(series)
    var rdv=0,ispv=0
    $('.mb-row').each(function(){
      var dn=$(this).attr('id').split('-')[3]*1
      var row_data=[]
      row_data.push(($(this).find('.mbd-date').hasClass('flagged')?'* ':'')+dn)
      row_data.push(((!dataset[dn]?0:dataset[dn].up)/sc).toFixed(_dec)*1)
      if(inc_rd){
        rdv=!monthly_totals.pnd[dn]?null:((monthly_totals.pnd[dn].up/sc).toFixed(_dec)*1)
        row_data.push(rdv==0?null:rdv)
      }
      if(inc_isp){
        ispv=!isp_totals[dn]?null:((isp_totals[dn].up/sc).toFixed(_dec)*1)
        row_data.push(ispv)
      }
      graph_data.addRow(row_data)
    })
    options['series']=series
  }
  function GetTotalGraphData(){
    var gr_scale=setGraphScale('tByts'),series=[]
    var sc=gr_scales[gr_scale]||g_toKB
    options['title']+=' (in '+gr_scale+')'
    options['vAxes'][0]['title']+='Total Usage (in '+gr_scale+')'
    graph_data.addColumn('number','YAMon - Downloads');
    graph_data.addColumn('number','YAMon - Uploads');
    series.push({color:yd_colour,type:'column',visibleInLegend:true,targetAxisIndex:0})
    series.push({color:yu_colour,type:'column',visibleInLegend:true,targetAxisIndex:0})
    SetCols(series)
    var rdv=0,ispv=0
    $('.mb-row').each(function(){
      var dn=$(this).attr('id').split('-')[3]*1
      var row_data=[]
      row_data.push(($(this).find('.mbd-date').hasClass('flagged')?'* ':'')+dn)
      row_data.push(((!dataset[dn]?0:dataset[dn].down)/sc).toFixed(_dec)*1)
      row_data.push(((!dataset[dn]?0:dataset[dn].up)/sc).toFixed(_dec)*1)
      if(inc_rd){
        rdv=!monthly_totals.pnd[dn]?null:(((monthly_totals.pnd[dn].down+monthly_totals.pnd[dn].up)/sc).toFixed(_dec)*1)
        row_data.push(rdv==0?null:rdv)
      }
      if(inc_isp){
        ispv=!isp_totals[dn]?null:(((isp_totals[dn].down+isp_totals[dn].up)/sc).toFixed(_dec)*1)
        row_data.push(ispv)
      }
      graph_data.addRow(row_data)
    })
    options['series']=series
  }
  function GetCummulativeGraphData(){
    var gr_scale=setGraphScale('tByts'),series=[]
    var sc=gr_scales[gr_scale]||g_toKB
    options['title']+=' (in '+gr_scale+')'
    options['vAxes'][0]['title']+='Cummulative Usage (in '+gr_scale+')'
    graph_data.addColumn('number','YAMon - Downloads');
    graph_data.addColumn('number','YAMon - Uploads');
    series.push({color:yd_colour,type:'column',visibleInLegend:true,targetAxisIndex:0})
    series.push({color:yu_colour,type:'column',visibleInLegend:true,targetAxisIndex:0})
    SetCols(series)
    var rdv=0,ispv=0
    var dt=0,ut=0
    $('.mb-row').each(function(){
      var dn=$(this).attr('id').split('-')[3]*1
      var row_data=[]
      row_data.push(($(this).find('.mbd-date').hasClass('flagged')?'* ':'')+dn)
      dt+=(!dataset[dn]?0:dataset[dn].down)
      ut+=(!dataset[dn]?0:dataset[dn].up)
      if((!dataset[dn]||dataset[dn].down+dataset[dn].up)==0){
        row_data.push(null)
        row_data.push(null)
      }
      else{
        row_data.push((dt/sc).toFixed(_dec)*1)
        row_data.push((ut/sc).toFixed(_dec)*1)
      }
      if(inc_rd){
        rdv+=!monthly_totals.pnd[dn]?0:(monthly_totals.pnd[dn].down+monthly_totals.pnd[dn].up)
        row_data.push((!monthly_totals.pnd[dn]||monthly_totals.pnd[dn].down+monthly_totals.pnd[dn].up==0)?null:(rdv/sc).toFixed(_dec)*1)
      }
      if(inc_isp){
        ispv+=!isp_totals[dn]?0:(isp_totals[dn].down+isp_totals[dn].up)
        row_data.push((!isp_totals[dn]||(isp_totals[dn].down+isp_totals[dn].up)==0)?null:(ispv/sc).toFixed(_dec)*1)
      }
      graph_data.addRow(row_data)
    })
    options['series']=series
  }
  function GetAbsDiffGraphData(){
    var gr_scale='MB',series=[]
    var sc=gr_scales[gr_scale]||g_toKB
    options['title']+=' (in '+gr_scale+')'
    options['vAxes'][0]['title']+='Differences (in '+gr_scale+')'
    SetDiffCols(series)
    var rdd=0,rdu=0,rdt=0
    var idd=0,idu=0,idt=0
    $('.mb-row').each(function(){
      var dn=$(this).attr('id').split('-')[3]*1
      var row_data=[]
      row_data.push(($(this).find('.mbd-date').hasClass('flagged')?'* ':'')+dn)
      if(inc_rd){
        rdd=monthly_totals.pnd[dn].dn_d
        rdu=monthly_totals.pnd[dn].up_d
        rdt=rdd+rdu
        row_data.push((rdd/sc).toFixed(_dec)*1)
        row_data.push((rdu/sc).toFixed(_dec)*1)
        row_data.push((rdt/sc).toFixed(_dec)*1)
      }
      if(inc_isp){
        idd=$(this).find('.i-d').data('d')*1
        idu=$(this).find('.i-u').data('d')*1
        idt=idd+idu
        row_data.push((idd/sc).toFixed(_dec)*1)
        row_data.push((idu/sc).toFixed(_dec)*1)
        row_data.push((idt/sc).toFixed(_dec)*1)
      }
      graph_data.addRow(row_data)
    })
    options['series']=series
  }
  function GetPerDiffGraphData(){
    var gr_scale='%',series=[]
    var sc=gr_scales[gr_scale]||g_toKB
    options['title']+=' (in '+gr_scale+')'
    options['vAxes'][0]['title']+='Differences (in '+gr_scale+')'
    SetDiffCols(series)
    var rdd=0,rdu=0,rdt=0
    var idd=0,idu=0,idt=0
    $('.mb-row').each(function(){
      var dn=$(this).attr('id').split('-')[3]*1
      var row_data=[]
      row_data.push(($(this).find('.mbd-date').hasClass('flagged')?'* ':'')+dn)
      if(inc_rd){
         if(monthly_totals.pnd[dn].dn_p==0 && monthly_totals.pnd[dn].up_p ==0){
          row_data.push(null)
          row_data.push(null)
          row_data.push(null)
        }
        else{
          rdd=monthly_totals.pnd[dn].dn_p*100
          rdu=monthly_totals.pnd[dn].up_p*100
          rdt=monthly_totals.pnd[dn].t_p*100
          row_data.push((rdd/sc).toFixed(_dec)*1)
          row_data.push((rdu/sc).toFixed(_dec)*1)
          row_data.push((rdt/sc).toFixed(_dec)*1)
        }
      }
      if(inc_isp){
        if($(this).find('.i-d').data('p')==0 && $(this).find('.i-u').data('p')==0){
          row_data.push(null)
          row_data.push(null)
          row_data.push(null)
        }
        else{
          idd=$(this).find('.i-d').data('p')*1
          idu=$(this).find('.i-u').data('p')*1
          idt=($(this).find('.i-d').data('d')*1+$(this).find('.i-u').data('d')*1)/($(this).find('.downloads').data('value')*1+$(this).find('.uploads').data('value')*1)*100
          row_data.push((idd/sc).toFixed(_dec)*1)
          row_data.push((idu/sc).toFixed(_dec)*1)
          row_data.push((idt/sc).toFixed(_dec)*1)
        }
      }
      graph_data.addRow(row_data)
    })
    options['series']=series
  }
  function GetCummDiffGraphData(){
    var gr_scale='GB',series=[]
    var sc=gr_scales[gr_scale]||g_toKB
    options['title']+=' (in '+gr_scale+')'
    options['vAxes'][0]['title']+='Cummulative Differences (in '+gr_scale+')'
    SetDiffCols(series)
    var rdd=0,rdu=0,rdt=0
    var idd=0,idu=0,idt=0
    $('.mb-row').each(function(){
      var dn=$(this).attr('id').split('-')[3]*1
      var row_data=[]
      row_data.push(($(this).find('.mbd-date').hasClass('flagged')?'* ':'')+dn)
      if(inc_rd){
        if(monthly_totals.pnd[dn].dn_d==0 && monthly_totals.pnd[dn].up_d==0){
          row_data.push(null)
          row_data.push(null)
          row_data.push(null)
        }
        else{
          rdd+=monthly_totals.pnd[dn].dn_d
          rdu+=monthly_totals.pnd[dn].up_d
          rdt=rdd+rdu
          row_data.push((rdd/sc).toFixed(_dec)*1)
          row_data.push((rdu/sc).toFixed(_dec)*1)
          row_data.push((rdt/sc).toFixed(_dec)*1)
        }
      }
      if(inc_isp){
         if($(this).find('.i-d').data('d')==0 && $(this).find('.i-u').data('d')==0){
          row_data.push(null)
          row_data.push(null)
          row_data.push(null)
        }
        else{
          idd+=$(this).find('.i-d').data('d')*1
          idu+=$(this).find('.i-u').data('d')*1
          idt=idd+idu
          row_data.push((idd/sc).toFixed(_dec)*1)
          row_data.push((idu/sc).toFixed(_dec)*1)
          row_data.push((idt/sc).toFixed(_dec)*1)
        }
      }
      graph_data.addRow(row_data)
    })
    options['series']=series
  }
  function GetCummPerDiffGraphData(){
    var gr_scale='%',series=[]
    var sc=gr_scales[gr_scale]||g_toKB
    options['title']+=' (in '+gr_scale+')'
    options['vAxes'][0]['title']+='Cummulative Differences (in '+gr_scale+')'
    SetDiffCols(series)
    var rdd=0,rdu=0,rdt=0
    var idd=0,idu=0,idt=0
    var yd=0,yu=0,yt=0
    $('.mb-row').each(function(){
      var dn=$(this).attr('id').split('-')[3]*1
      var row_data=[]
      row_data.push(($(this).find('.mbd-date').hasClass('flagged')?'* ':'')+dn)
      yd+=$(this).find('.downloads').data('value')*1
      yu+=$(this).find('.uploads').data('value')*1
      yt=yd+yu
      if(inc_rd){
         if(monthly_totals.pnd[dn].dn_d==0 && monthly_totals.pnd[dn].up_d==0){
          row_data.push(null)
          row_data.push(null)
          row_data.push(null)
        }
        else{
          rdd+=monthly_totals.pnd[dn].dn_d
          rdu+=monthly_totals.pnd[dn].up_d
          rdt=rdd+rdu
          row_data.push((100*rdd/yd).toFixed(_dec)*1)
          row_data.push((100*rdu/yu).toFixed(_dec)*1)
          row_data.push((100*rdt/yt).toFixed(_dec)*1)
        }
      }
      if(inc_isp){
        if($(this).find('.i-d').data('d')==0 && $(this).find('.i-u').data('d')==0){
          row_data.push(null)
          row_data.push(null)
          row_data.push(null)
        }
        else{
          idd+=$(this).find('.i-d').data('d')*1
          idu+=$(this).find('.i-u').data('d')*1
          idt=idd+idu
          row_data.push((100*idd/yd).toFixed(_dec)*1)
          row_data.push((100*idu/yu).toFixed(_dec)*1)
          row_data.push((100*idt/yt).toFixed(_dec)*1)
        }
      }
      graph_data.addRow(row_data)
    })
    options['series']=series
  }
  $('#gr-'+wg)[$('#'+wg).is(':checked')&&$('#'+wg).parents('label').is(':visible')?'show':'hide']()
  if(!$('#'+wg).parents('label').is(':visible')) return
  if(!$('#'+wg).is(':checked'))return
  var w_ya='.'+wg,cn='',w_yu,w_yd,w_isp,w_td,w_a,is_pct=false,noyamon=false,is_cpct=false,is_tot=(wg=='cb-tot'),ct,g_sc,gr_scale,loc='column'
  var un=$('#mb-filter').val()
  var mbfs=$("#mb-filter option:selected")
  if(mbfs.hasClass('ddl-d')){
    var mac=mbfs.attr('id').split('-')[1]
    var dataset=monthly[mac].usage
  }
  else if(mbfs.hasClass('ddl-u')){
    var name=mbfs.attr('id').split('-')[1]
    var dataset=names[name].usage
  }
  else{
    var dataset=monthly_totals.usage
  }
  var dec=_dec
  var inc_rd=$('#ShowRD').is(':checked')&& un==='ALL',inc_isp=$('#showISP').is(':checked')&& un==='ALL'
  var gr_scale,gr_scales=[]
  gr_scales['%']=1
  gr_scales['GB']=g_toGB
  gr_scales['MB']=g_toMB
  gr_scales['kB']=g_toKB
  var mo=twod(_rs_Date.getMonth()+1),yr=_rs_Date.getFullYear()
  if(!g_Settings['isp'][mo+'-'+yr]){
    var isp_totals={}
  }
  else{
    var isp_totals=JSON.parse(g_Settings['isp'][mo+'-'+yr])
  }
  var graph_data=new google.visualization.DataTable();
  graph_data.addColumn('string','Day');
  var yd_colour='mediumblue',yu_colour='mediumturquoise',y_colour='blue'
  var options={width:maxGrWidth,height:400,title:'',legend:{position:'top'},isStacked:true,hAxis:{textStyle:{fontSize:9},title:$('.current-interval').first().text(),slantedText:true,titleTextStyle:{f:'green'}},vAxes:{0:{title:'',titleTextStyle:{color:'green'},minValue:0}},series:{}};
  var ispname=$('#isp-format option:selected').text()
  switch (wg) {
    case 'cb-down':
      options['title']='Downloads by Day'
      GetDownloadGraphData()
      break;
    case 'cb-up':
      options['title']='Uploads by Day'
      GetUploadGraphData()
      break;
    case 'cb-tot':
      options['title']='Total Traffic by Day'
      GetTotalGraphData()
      break;
     case 'cb-cum':
      options['title']='Cumulative Traffic'
      GetCummulativeGraphData()
      break;
     case 'cb-dif':
      options['title']='Absolute Differences from YAMon'
      GetAbsDiffGraphData()
      break;
     case 'cb-difp':
      options['title']='Differences from YAMon'
      GetPerDiffGraphData()
      break;
     case 'cb-cdif':
      options['title']='Cummulative Differences from YAMon'
      GetCummDiffGraphData()
      break;
     case 'cb-cdifp':
      options['title']='Cummulative Differences from YAMon'
      GetCummPerDiffGraphData()
      break;
  }
  var chart=new google.visualization.ColumnChart(document.getElementById('gr-'+wg));
  chart.draw(graph_data,options);
}
function setGraphScale(range){
  var gr=$('#bdFooter .' + range).first()
  if(gr.hasClass('GBytes')&&Number(gr.text()>10)) return 'GB'
  if(gr.hasClass('GBytes')) return 'MB'
  if(gr.hasClass('MBytes')&&Number(gr.text()>10)) return 'MB'
  return 'KB'
}
function set_bd_graphs(){
  $('.gr-cb').each(function(){
    g_Settings['graphs'][$(this).attr('id')]=$(this).is(':checked')
  })
  saveSettings()
  $('.disabled-btn').removeClass('disabled-btn')
  $('#no-graphs')[$('.gr-cb:checked').length==0?'addClass':'removeClass']('disabled-btn')
  $('#all-graphs')[$('.gr-cb').length==$('.gr-cb:checked').length?'addClass':'removeClass']('disabled-btn')
}
function resetdates(){
  var cd=new Date()
  $('#dateFMT-1').text(formattedDate(cd,0))
  $('#dateFMT-2').text(formattedDate(cd,1))
  $('#dateFMT-3').text(formattedDate(cd,2))
  if(!_cr_Date) return
  $('.current-date').text(formattedDate(_cr_Date))
  $('.current-interval').text(formattedDate(_rs_Date)+' - '+formattedDate(_re_Date))
  $('#monthly-breakdown-tab').removeClass('loaded')
  $('#MonthlyBreakdown').html('')
  if($('#monthly-breakdown-tab-section').is(':visible')) setMonthlyBreakdown()
  DrawHourlyGraph()
}
function formattedDate(d,v){
  var days=['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  var months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  if (typeof(v)=='undefined') v=$('#dateFMT').val()*1
  var sep=$('#dateSep').val(),ret=''
  var da=days[d.getDay()],dn=twod(d.getDate()),m=twod(d.getMonth()+1),mn=months[d.getMonth()],y=d.getFullYear()
  switch (v) {
    case 0:
      ret=da+' '+mn+sep+dn+sep+y
      break
    case 1:
      ret=da+' '+dn+sep+mn+sep+y
      break
    case 2:
      ret=da+' '+dn+sep+m+sep+y
      break
  }
  return ret
}
function createdb(){
  var ss=JSON.stringify(g_Settings)
  localStorage.setItem('YAMon3-Settings',ss)
  showLoading('Creating Settings Database...')
  var request=$.ajax({
    url: domain+"db/createdb.php",
    type: "POST",
    data: {settings:ss },
    dataType: "json"
  });
  request.done(function( data ) {
    if (data.response=='error') {
      alert( data.comment );
      return
    }
    $('#getKey,#dbkey-needtoclick').remove()
    $('#dbkey').attr('disabled',false).val(data.dbkey).fadeIn('slow')
    $('#dbkey-clicked').fadeIn('slow')
    clearLoading()
  });
  request.fail(function( jqXHR,textStatus ) {
    if(confirm("Creating your database failed with error message: " + textStatus +":  " +  errorThrown +"?!?\n\nClick `OK` to try again or `Cancel`")){
      createdb()
    }
  });
}
function setCB(wb){
  var wwc=$(wb).parents('.p-cb-top').find('.p-cb'),tst=wwc.find('.p-cb-st'),rcb=wwc.attr('id'),cs=wwc.attr('state')||'none',md=wwc.attr('mode')||''
  tst.removeClass('checked partial')
  if (cs == 'none') {
    wwc.attr('state','checked')
    tst.addClass('checked')
    $('.' + rcb).prop('checked',md=='')
  }
  else {
    wwc.attr('state','none')
    $('.' + rcb).prop('checked',false)
  }
  if (!$('.edit-restrictions .rest-save').is(':visible')) $('.edit-restrictions .rest-save').fadeIn('slow')
}
function clickCB(wb){
  var pcb=$(wb).parents('.p-cb-top').find('.p-cb'),cn=pcb.attr('id'),rc='.'+cn,rcl=$(rc).length,rccl=$(rc+':checked').length,md=pcb.attr('mode')||'',ns
  if ((rcl==rccl) && (md=='')) ns='checked'
  else if (rcl==rccl) ns=''
  else if (rccl==0) ns=''
  else ns='partial'
  $('#' + cn).attr('state',ns)
  $('#' + cn).find('.p-cb-st').removeClass('checked partial').addClass(ns)
  if (!$('.edit-restrictions .rest-save').is(':visible')) $('.edit-restrictions .rest-save').fadeIn('slow')
}
function updateDashboard(){
  var cd=_cr_Date.setHours(0,0,0,0)
  var suf=['att', 'ati','utt','uti']
  suf.forEach(function(s) {
    $('#ds-' + s).html('')
  })
  for (var d in devices) {
    var device=devices[d]
    var da = device.added.split(' '),ymda = da[0].split('-'),added = (new Date(ymda[0], ymda[1] - 1, ymda[2],0,0,0))
    var du = device.updated.split(' '),ymdu = du[0].split('-'),updated = (new Date(ymdu[0], ymdu[1] - 1, ymdu[2],0,0,0))
    var dv='', tgt='', ti=device.group+'-->'+device.name
    if (cd-added == 0) {
      dv=da[0]
      tgt='att'
    }
    /*else if ( cd-updated == 0) {
      dv=du[0]
      tgt='utt'
    } */
    else if (added > _rs_Date && added < _re_Date) {
      dv=da[0]
      tgt='ati'
    }
    /*else if (updated > _rs_Date && updated < _re_Date) {
      dv=du[0]
      tgt='uti'
    } */
    else continue
    $('<p/>').attr('title',ti).html(device.name+" <span class='upd'>("+dv+")</span>").appendTo('#ds-'+tgt)
  }
  suf.forEach(function(s) {
    $('#ds-'+s).html()==0 && $('#ds-'+s).html('n/a')
  })
  $('#st-d-db').data('value',hourly_totals.down)
  $('#st-i-db').data('value',monthly_totals.down)
  $('#st-d-ub').data('value',hourly_totals.up)
  $('#st-i-ub').data('value',monthly_totals.up)
  $('#st-d-tb').data('value',hourly_totals.down+hourly_totals.up)
  $('#st-i-tb').data('value',monthly_totals.down+monthly_totals.up)
  $('#ds-olt').text(Object.keys(hourly).length)
  $('#ds-oli').text(Object.keys(monthly).length)
  var nl = Object.keys(names).sort(byGMTot)
  for(var n=0;n<3;n++){
    if(!nl[n]) continue
    var ci=nl[n], wd=names[ci]
    $('#st-i-tgn'+n).parents('td').data('g-n',ci)
    $('#st-i-tgn'+n).text(wd.group).attr('title',ci)
    $('#st-i-tgv'+n).data('value',names[ci].down + names[ci].up)
  }
  var dl = Object.keys(monthly).sort(byMMTot)
  for(var n=0;n<3;n++){
    if(!dl[n]) continue
    var ci=dl[n], wd=devices[ci],gn=wd.cg,ddn=wd.cn
    $('#st-i-tdn'+n).parents('td').data('g-n',gn+'-'+ddn)
    $('#st-i-tdn'+n).text(wd.name).attr('title',ci)
    $('#st-i-tdv'+n).data('value',monthly[ci].down + monthly[ci].up)
  }
  var hl = Object.keys(hourly).sort(byHTot)
  for(var n=0;n<3;n++){
    if(!hl[n]) continue
    var ci=hl[n], wd=devices[ci],gn=wd.cg,ddn=wd.cn
    $('#st-d-tdn'+n).parents('td').data('g-n',gn+'-'+ddn)
    $('#st-d-tdn'+n).text(wd.name).attr('title',ci)
    $('#st-d-tdv'+n).data('value',hourly[ci].down + hourly[ci].up)
  }
  $("#sp-freeMem").text()==0 && $("#sp-freeMem").text(freeMem)
  displayBytes('#SummaryUsageTable')
}
function sortDevices(c,so){
  var rows = $('#devicesData tr')
  rows.sort(function (a, b) {
    switch (c) {
      case 5:
        var A = $(a).children('td').eq(c).data('value') * 1
        var B = $(b).children('td').eq(c).data('value') * 1
        return A > B ? so : (A < B ? -so : 0)
        break
      case 6:
        var A = $(a).children('td').eq(c - 1).data('value') * 1
        var B = $(b).children('td').eq(c - 1).data('value') * 1
        break
      case 7:
        var A = $(a).children('td').eq(c).attr('title')
        var B = $(b).children('td').eq(c).attr('title')
        break
      default:
        var A = $(a).children('td').eq(c).text().toUpperCase()
        var B = $(b).children('td').eq(c).text().toUpperCase()
        break
    }
    return A > B ? so : (A < B ? -so : 0)
  });
  $.each(rows, function (index, row) {
    $('#devicesData').append(row);
  });
}
function exportTableToCSV(tablename) {
  function breakdown2csv(){
    var str=''
    str='"Date","Total Down","Total Up",'+(_unlimited_usage=='1'?'"Bonus Down","Bonus Up",':'')+'"'+$('.th-tot').first().text()+'","Aggregate",'+($('#showISP').is(':checked')?'"ISP Down","ISP Up","ISP Total","Aggregate",':'')+'"Router Down","Router Up","Router Total","Aggregate"\r\n'

    str += '"' + $tr.map(function (i, row) {
      var $row = $(row), $cols = $row.find('td');
      return $cols.map(function (j, col) {
        var $col = $(col), text = (!$col.data('value')||isNaN($col.data('value')))?$col.text():($col.data('value')/g_toMB).toFixed(2);
        return text.replace(/"/g, '""'); // escape double quotes
      }).get().join(tmpColDelim);
    }).get().join(tmpRowDelim)
      .split(tmpRowDelim).join(rowDelim)
      .split(tmpColDelim).join(colDelim) + '"'
    return str
  }
   function devices2csv(){
    var str = 'var users_created="' + users_created + '"\n\n'
    Object.keys(devices).sort(byName).forEach(function (d) {
      var di = d.split('-'),mac = di[0].toLowerCase(),key = ''
      if (!di[1]) {}
      else {
        key = ',"key":' + di[1]
      }
      str += 'ud_a({"mac":"' + mac + '","ip":"' + devices[d].ip + (typeof(_includeIPv6)=='undefined'?'':('","ip6":"' + devices[d].ip6)) + '","owner":"' + devices[d].group + '","name":"' + devices[d].name + '"' + key + ',"colour":"' + devices[d].colour + '","added":"' + devices[d].added + '","updated":"' + devices[d].updated + '"})\n'
    })
    return str
  }
  var $tr = $('#'+tablename).find('tr:visible:has(td)'),
    tmpColDelim = String.fromCharCode(11),
    tmpRowDelim = String.fromCharCode(0),
    colDelim = '","',
    rowDelim = '"\r\n"'
    switch (tablename) {
      case 'Monthly-breakdown-table':
        var csv=breakdown2csv(), datatype='application/csv', filename=tablename+'.csv'
        break;
      case 'devices-table':
        var csv=devices2csv(), datatype='text/javascript',filename='users.js'
        break
    }
    var csvData = 'data:'+datatype+';charset=utf-8,' + encodeURIComponent(csv);

  $(this).attr({'download': filename,'href': csvData,'target': '_blank'});
}
function nudge(){
  getMessage('nudge', '')
  $('.dismiss button').unbind('click').click(function(){
    var request=$.ajax({
      url: domain+"current/dismiss"+_file_version+".php",
      type: "POST",
      data: {k:$('#pnw').val(), u:g_Settings.uid},
      dataType: "json"
    });
    request.done(function( data ) {
      if (data.response=='success') {
        g_Settings.fnd=data.res
        saveSettings(false)
        $('.dismiss').slideUp('fast')
        $('#pu-comment').text(data.msg).slideDown('slow').siblings().slideUp('fast')
        $('#pop-up').delay(3600).slideUp('slow').fadeOut('slow')
      }
      else {
        alert( 'Something bad happened... wait a few minutes and try again or contact Al' );
      }
    });
  })
}
function addPU(){
  var pu=$('<div/>').attr('id','pop-up'), arl=$('<article/>').addClass('left-col').attr('id','pop-up-body'), p=$('<p/>').attr('id','pu-comment').addClass('hidden'),p2=$('<p/>').addClass('a-c dismiss p-r').html("<button>Dismiss</button>"), fb=$('<div/>').addClass('fb-like').attr('data-href','https://www.facebook.com/UsageMonitoring/').attr('data-layout','standard').attr('data-width','200').attr('data-action','recommend').attr('data-size','small').attr('data-show-faces','false').attr('data-share','false')
  arl.appendTo(pu)
  p.appendTo(pu)
  p2.appendTo(pu)
  fb.appendTo(pu)
  pu.prependTo('#main-body')
  $('.dismiss button').unbind('click').click(function(){
    $('#pu-comment').slideDown('slow').siblings().slideUp('fast')
    $('#pop-up').delay(3600).slideUp('slow').fadeOut('slow')
  })
}

function getMessage(msg, more){
  var deferred = $.Deferred()
  if($('#pop-up').length==0) addPU()
  $('#pop-up-body').html('')
  var request=$.ajax({
      url: domain+"current/getMSG.php",
      type: "GET",
      data: {u:g_Settings.uid, m:msg, m2:more},
      dataType: "json"
    });
  request.done(function( data ) {
    if (data.response=='success') {
      $('#pop-up-body').append(data.html).slideDown('slow')
      $('#pop-up, .dismiss').slideDown('slow')
      $('#pu-comment').hide()
      deferred.resolve()
    }
    else {
      $('#pop-up').html("Something bad happened with this request... wait a few minutes and try again or send a message to <a href='mailto:questions@usage-monitoring'>questions@usage-monitoring</a>" );
      deferred.fail()
    }
  });
  return deferred.promise()
}
function checkFiles(){
  if($('#pop-up').length==0) addPU()
  var request=$.ajax({
      url: domain+"current/checkFiles"+_file_version+".php",
      type: "GET",
      data: {u:g_Settings.uid, b:_scriptVersion,h:_html_version,f:g_Settings.check4Updates},
      dataType: "json"
    });
  request.done(function( data ) {
    if (data.response=='success') {
      $('#pop-up-body').html(data.html).slideDown('slow')
      $('#pop-up, .dismiss').slideDown('slow')
      $('#pu-comment').hide()

      var freq={'a':'day', 'w':'week','m':'month','n':'day'}
      var msg=(g_Settings.check4Updates=='n')?'when you click `Now!` again':("in 1 "+freq[g_Settings.check4Updates])
      $('#pu-comment').html("Next check for updates "+msg+'. You can change the frequency of these checks on the `Settings` tab.')
      if(!g_Settings.uid) g_Settings.uid=data.uid
      g_Settings.nextCheck=data.nextCheck
      saveSettings(false)
    }
    else {
      $('#pop-up').html("Something bad happened with this request... wait a few minutes and try again or send a message to <a href='mailto:questions@usage-monitoring'>questions@usage-monitoring</a>" );
    }
  });
}
function addISPList(){
  var isp_list = ['','Rogers|Canada','Electronic Box|Canada','Bell (Eng)|Canada','Bell (Fr)|Canada','Cox|United States','ATT|United States','Telstra|Australia','Sodetel|Lebanon','TekSavvy|Canada','GCI|United States','Videotron|United States','Cable ONE|United States','Afrihost|South Africa']
  $('#isp-format').html('')
  $('<option/>').attr('value',0).attr('disabled','disabled ').text('Pick your ISP').appendTo('#isp-format')
  $(isp_list).each(function (a, b) {
    if(b=='') return
    var isp=b.split('|')[0], fc=('flag '+b.split('|')[1].replace(' ','-'))
    var ni=$('<option/>').attr('value',isp).text(isp).attr('class',fc)
    ni.appendTo('#isp-format')
  })

  var ni=$('<option/>').attr('value','Other').text('Other...')
  ni.appendTo('#isp-format')
}
function hourlyTable(){
  $('#hourly-tbody').html('')
  $('#hourly-tfoot').html('')
  $('#hourly-coming-soon').remove()
  $('#DailyData .deviceName').each(function(){
    var tr=$(this).parents('tr').clone(true, true).detach(), mac=tr.data('mac'), group=tr.data('group')
    var gp=$('<td/>').addClass('group bl').text(devices[mac]['group'])
    tr.removeAttr('id').find('.deviceName').siblings().remove()
    gp.prependTo(tr)
    for(var x=0;x<24;x++){
      var td=$('<td/>').addClass(x<12?'AM':'PM')
      var down=$('<span/>').addClass('num').addClass('downloads').data('value',hourly[mac]['usage'][x]['down'])
      var up=$('<span/>').addClass('num').addClass('uploads').data('value',hourly[mac]['usage'][x]['up'])
      down.appendTo(td)
      up.appendTo(td)
      td.appendTo(tr)
    }
    tr.appendTo('#hourly-tbody')
  })
  var tots=$('#hourly-tbody tr').last().clone(false, false).detach(), rtot=$('#hourly-tbody tr').last().clone(false, false).detach(), diff=$('#hourly-tbody tr').last().clone(false, false).detach(), loc=$('#hourly-tbody tr').last().clone(false, false).detach()
  tots.find('.group').text('')
  tots.find('.deviceName').text('Totals')
  rtot.find('.group').text('')
  rtot.find('.deviceName').text('Router')
  diff.find('.group').text('')
  diff.find('.deviceName').text('Differences')
  loc.find('.group').text('')
  loc.find('.deviceName').text('Local Traffic')
  //todo--- finish local traffic row
  for(var x=0;x<24;x++){
    var td=!hourly_totals.usage[x]?0:hourly_totals.usage[x].down, tu=!hourly_totals.usage[x]?0:hourly_totals.usage[x].up
    var rd=!pnd_data.usage[x]?0:pnd_data.usage[x].down, ru=!pnd_data.usage[x]?0:pnd_data.usage[x].up
    tots.find('td .downloads').eq(x).data('value',td)
    tots.find('td .uploads').eq(x).data('value',tu)
    rtot.find('td .downloads').eq(x).data('value',rd)
    rtot.find('td .uploads').eq(x).data('value',ru)
    diff.find('td .downloads').eq(x).data('value',td-rd)
    diff.find('td .uploads').eq(x).data('value',tu-ru)
  }
  tots.appendTo('#hourly-tfoot')
  rtot.appendTo('#hourly-tfoot')
  diff.appendTo('#hourly-tfoot')
  $('.AM').show()
  $('.PM').hide()
}
function sortHourly(){
  function byDeviceName(a,b) {
    var d1=$(a).find('.deviceName').text().toLowerCase()
    var d2=$(b).find('.deviceName').text().toLowerCase()
    return d1>d2?1:(d1<d2?-1:0);
  }
  var rows = $('#hourly-tbody tr')
  rows.sort(function (a, b) {
    var A = $(a).find('.group').text().toLowerCase()
    var B = $(b).find('.group').text().toLowerCase()
    return A > B ? 1 : (A < B ? -1 : byDeviceName(a,b))
  });
  $.each(rows, function (index, row) {
    $('#hourly-tbody').append(row);
  });
}